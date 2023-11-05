import puppeteer, { Page } from "puppeteer";
import sdk from "node-appwrite";
import "dotenv/config"
import { BetData, Match } from "./types/pinnacle";

const client = new sdk.Client();

console.log(process.env.APPWRITE);

client
  .setEndpoint(process.env.APPWRITE || '')
  .setProject(process.env.PROJECT || '')
  .setKey(process.env.KEY || '');

const databases = new sdk.Databases(client);
console.log("starting");

async function start() {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--start-maximized",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--window-position=0,0",
      `--window-size=1920,1080`,
    ],
    headless: false,
  });

  const page = await browser.newPage();
  console.log("new page created!");

  await page.goto("https://www.pinnacle.com/en/esports/games/cs2/matchups", {
    timeout: 100000,
  });

  await startParse(page);
}

start();

async function startParse(page: Page) {
  page.on("response", async (response: any) => {
    if (response.request().method().toUpperCase() != "OPTIONS") {
      const url = response.url();

      if (url.includes("sports/12/markets/straight")) {
        const data = await response.json();
        await addOdds(data);
      }
  
      if (url.includes("sports/12/matchups")) {
        const data = await response.json();
  
        await addOrUpdateMatch(data);
      }
    }
  });
}

async function addOrUpdateMatch(item: Match[]) {
  item.forEach(async (data) => {
    console.log("addOrUpdateMatch");
    const matchId = data.id.toString();
    const league = data.league;
    const tournamentName = league.name;
    const participants = data.participants;

    const validDisciplines = ["Dota 2", "CS:GO", "League of Legends", "CS2"];
    const discipline = validDisciplines.find((d) =>
      tournamentName.startsWith(d)
    );

    if (!discipline) {
      return;
    }

    const match = await databases.listDocuments("parser", "matches", [
      sdk.Query.equal("pinnacleId", +matchId),
    ]);

    if (match.total === 0) {
      const newMatch = {
        pinnacleId: +matchId,
        pinnacleOdds: [],
        teams: [participants[0].name, participants[1].name],
        league: league.name,
        discipline:
          discipline === "Dota 2"
            ? "dota2"
            : discipline === "CS2"
              ? "cs2"
              : discipline === "CSGO"
                ? "csgo"
                : "lol",
        pinnacleUpdate: new Date(Date.now()).toISOString(),
      };
      await databases.createDocument("parser", "matches", sdk.ID.unique(), newMatch);
    } else {
      await databases.updateDocument(
        "parser",
        "matches",
        match.documents[0].$id,
        {
          pinnacleUpdate: new Date(Date.now()).toISOString(),
        }
      );
    }
  });
}
function addOdds(data: BetData[]) {
  console.log("addOdds");
  data.forEach(async (data) => {
    let prices: {
      designation: "over" | "under" | "home" | "away";
      points?: number;
      price: number;
    }[] = [];

    if (!['moneyline', 'total', 'spread'].includes(data.type)) {
      return;
    }
    data.prices.forEach((priceObj) => {
      if (!["over", "under", "home", "away"].includes(priceObj.designation)) {
        return;
      }
      if (data.type === "moneyline") {
        prices.push({
          designation: priceObj.designation as "home" | "away",
          price: +priceObj.price,
        });
      }
      if (data.type === "spread" || data.type === "total") {
        prices.push({
          designation: priceObj.designation as
            | "over"
            | "under"
            | "home"
            | "away",
          points: +priceObj.points,
          price: +priceObj.price,
        });
      }
    });

    const match = await databases.listDocuments("parser", "matches", [
      sdk.Query.equal("pinnacleId", +data.matchupId),
    ]);
    if (match.total === 0) {
      return;
    }
    
    const odds = await databases.listDocuments(
      "parser",
      "pinnacleOdds",
      [
        sdk.Query.equal("match", match.documents[0].$id),
        sdk.Query.equal("map", data.period),
        sdk.Query.equal("type", data.type),
        sdk.Query.orderDesc("time")
      ]
    )

    if (odds.total > 1) {
      const latestDoc: any = odds.documents[0]
      const latestPrices = latestDoc.prices;

      if (latestPrices.length > 0) {
        const pricearray = [latestPrices[0].price, latestPrices[1].price];
        if (pricearray.includes(prices[0].price) && pricearray.includes(prices[1].price)) {
          return;
        }
        
      }
    }

    
    

    const newOdd = {
      time: new Date(Date.now()).toISOString(),
      map: data.period,
      type: data.type,
      match: match.documents[0].$id,
      prices: prices,
    }

    try {
      await databases.createDocument("parser", "pinnacleOdds", sdk.ID.unique(), newOdd);
    } catch (e) {
      console.log(e);
      console.log(newOdd);
    }
    return;
  });
}
