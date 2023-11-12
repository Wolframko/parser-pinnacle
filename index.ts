import puppeteer, { Page } from "puppeteer";
import sdk from "node-appwrite";
import "dotenv/config"
import { BetData, Match } from "./types/pinnacle";
import { createDirectus, createItems, readItem, readItems, rest, schemaSnapshot, staticToken, triggerFlow, updateItems } from "@directus/sdk";
import { DirectusError } from "@directus/errors";
interface Matches {
  discipline: string,
  id: number,
  league: string,
  pinnacleId: number,
  team1: string,
  team2: string,
  pinnacleUpdate: string,
}

interface PinnacleOdd {
  date_created: string,
  id: number,
  map: number,
  match: number,
  type: string,
}

interface PinnaclePrice {
  id: number,
  designation: string,
  points: number,
  price: number
}

interface Schema {
  matches: Matches[],
  pinnacleOdds: PinnacleOdd[],
  pinnaclePrices: PinnaclePrice[],

}
const client = createDirectus<Schema>('https://directus-d4os4g4.service.wolframko.ru/').with(staticToken('YHdtOO8q1uspML5GmsZj0NkxH6sDIrSm')).with(rest());

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
  let matchesToAdd: {
    id: number;
    team1: string;
    team2: string;
    league: string;
    discipline: string;
    pinnacleUpdate: string;
  }[] = []

  let matchesToUpdate: number[] = []
  console.log('addOrUpdateMatches')
  for (let data of item) {
    const matchId = data.id.toString();
    const league = data.league;
    const tournamentName = league.name;
    const participants = data.participants;

    const validDisciplines = ["Dota 2", "CS:GO", "League of Legends", "CS2"];
    const discipline = validDisciplines.find((d) =>
      tournamentName.startsWith(d)
    );
    if (!discipline) {
      continue;
    }

    const match = await client.request(readItems("matches", {
      filter: {
        id: {
          _eq: +matchId
        }
      }
    }));
    const team1 = participants.filter(par => par.alignment === "home")[0].name
    const team2 = participants.filter(par => par.alignment === "away")[0].name

    if (match.length === 0) {
      const newMatch = {
        id: +matchId,
        team1: team1,
        team2: team2,
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
      matchesToAdd.push(newMatch);

    } else {
      matchesToUpdate.push(match[0].id)
    }
  }
  try {
    if (matchesToAdd.length > 0) {
      await client.request(createItems('matches', matchesToAdd));
    }

    if (matchesToUpdate.length > 0) {
      await client.request(updateItems('matches', matchesToUpdate, {
        pinnacleUpdate: new Date(Date.now()).toISOString()
      }))
    }
  } catch (e) {
    console.log(e);
  }
}


async function addOdds(item: BetData[]) {
  console.log("addOdds");

  // await client.request(
  //   //@ts-ignore
  //   triggerFlow('POST', '169ea130-3d44-4239-bc49-5fef070c32e6', item)
  // );

  let oddsForCreation: {
    time: string;
    map: number;
    type: string;
    prices: {
      designation: "over" | "under" | "home" | "away";
      points?: number | undefined;
      price: number;
    }[];
    index: string;
  }[] = []

  for (let data of item) {
      let prices: {
        designation: "over" | "under" | "home" | "away";
        points?: number;
        price: number;
      }[] = [];

      if (!['moneyline', 'total', 'spread'].includes(data.type)) {
        continue;
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
      // const match = await client.request(readItems("matches", {
      //   filter: {
      //     pinnacleId: {
      //       _eq: data.matchupId
      //     }
      //   }
      // }));

      // if (match.length == 0) {
      //   return;
      // }
      // const odds = await client.request(readItems("pinnacleOdds", {
      //   fields: [
      //     {
      //       prices: [
      //         'price'
      //       ]
      //     }
      //   ],
      //   filter: {
      //     match: {
      //       _eq: match[0].id
      //     },
      //     map: {
      //       _eq: data.period
      //     },
      //     type: {
      //       _eq: data.type
      //     },
      //     sort: ['-date_created']
      //   }
      // }));
      // if (odds.length > 0) {
      //   const latestDoc: any = odds[0]
      //   const latestPrices = latestDoc.prices;

      //   if (latestPrices.length > 0) {
      //     const pricearray = [latestPrices[0].price, latestPrices[1].price];
      //     if (pricearray.includes(prices[0].price) && pricearray.includes(prices[1].price)) {
      //       return;
      //     }

      //   }
      // }
      const newOdd = {
        time: new Date(Date.now()).toISOString(),
        map: data.period,
        type: data.type,
        prices: prices,
        match: {
          "id": data.matchupId
        },
        index: `${data.period}${data.type}${data.matchupId}${prices[0].designation}${prices[0].points}${prices[0].price}${prices[1].designation}${prices[1].points}${prices[1].price}`,
      }

      oddsForCreation.push(newOdd);
  }

  try {
    console.log("Creating odds");
    console.log(oddsForCreation.length);
    await client.request(createItems('pinnacleOdds', oddsForCreation));
  } catch (e: any) {
    if (e.errors[0].message.includes("Invalid foreign key for field")) {
    } else if (e.errors[0].message.includes("has to be unique"))  {
    }
    else {
      console.log(e);
    }
  }

}
