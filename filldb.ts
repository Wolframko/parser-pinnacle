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
type PriceType = {
    designation: "over" | "under" | "home" | "away";
    points?: number;
    price: number;
};
// In-memory storage for the latest prices
const latestPricesMap = new Map<string, PriceType[]>();

// Function to create a unique key for each match, period, and type
const createKey = (matchId: string, period: string, type: string) => `${matchId}-${period}-${type}`;

// Define the structure for the match
type MatchType = {
    $id: string;
    // ... any other properties
  };
  
  // In-memory storage for matches
  const matchesMap = new Map<number, MatchType>();


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

let disableMatchups = false;
let disableStraight = false

async function startParse(page: Page) {
    page.on("response", async (response: any) => {
        if (response.request().method().toUpperCase() != "OPTIONS") {
            const url = response.url();

            if (url.includes("sports/12/markets/straight")) {
                const data = await response.json();
                addOdds(data);
                disableStraight = true;
            }

            if (url.includes("sports/12/matchups") && !disableMatchups) {
                const data = await response.json();
                addOrUpdateMatch(data);
                disableMatchups = true;
            }
        }
    });
}

async function addOrUpdateMatch(item: Match[]) {
    let promises: Promise<sdk.Models.Document>[] = [];
    item.forEach(async (data) => {
        console.log("addOrUpdateMatch");
        const matchId = data.id.toString();
        const league = data.league;
        const tournamentName = league.name;
        const participants = data.participants;

        const validDisciplines = ["Dota 2", "League of Legends", "CS2"];
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
            const uid = sdk.ID.unique()
            const create = databases.createDocument("parser", "matches", uid, newMatch);
            matchesMap.set(+matchId, {$id: uid});
            console.log("create", uid);
            promises.push(create);

        } else {
            const update = databases.updateDocument(
                "parser",
                "matches",
                match.documents[0].$id,
                {
                    pinnacleUpdate: new Date(Date.now()).toISOString(),
                }
            );
            matchesMap.set(+matchId, {$id: match.documents[0].$id});
            console.log('update ',+matchId, match.documents[0].$id);
            promises.push(update);

        }
    });
    Promise.all(promises).then(() => {
        console.log('Success')
    }).catch((e) => {
        console.log('error')
    });
}

function addOdds(data: BetData[]) {
    console.log("addOdds");
    let promises: Promise<sdk.Models.Document>[] = [];
    data.forEach(async (data) => {
        let prices: PriceType[] = [];

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
        const matchId = matchesMap.get(data.matchupId);
        console.log('matchupId:', data.matchupId, 'matchId:', matchId);
        if (!matchId) {
            return;
        }
        const newOdd = {
            time: new Date(Date.now()).toISOString(),
            map: data.period,
            type: data.type,
            match: matchId.$id,
            prices: prices,
        }
        // Create a unique key for the current odd
        const key = createKey(newOdd.match, `${newOdd.map}`, newOdd.type);

        // Check if the current prices are equal to the latest prices
        const latestPrices = latestPricesMap.get(key);
        console.log('latestPrices: ' + latestPrices? JSON.stringify(latestPrices) : 'undefined');
        if (latestPrices) {
            const currentPrices = newOdd.prices.map(p => p.price).sort();
            const storedPrices = latestPrices.map(p => p.price).sort();

            if (JSON.stringify(currentPrices) === JSON.stringify(storedPrices)) {
                console.log('Current prices are equal to the latest prices. Skipping update.');
            } else {
                // Update the latest prices since they are different
                latestPricesMap.set(key, newOdd.prices);
                let createdDocument = databases.createDocument("parser", "pinnacleOdds", sdk.ID.unique(), newOdd);

                promises.push(createdDocument);
                console.log('Prices updated for', key);
            }
        } else {
            // No prices stored yet, so add the new ones
            latestPricesMap.set(key, newOdd.prices);
            let createdDocument = databases.createDocument("parser", "pinnacleOdds", sdk.ID.unique(), newOdd);

            promises.push(createdDocument);
            console.log('New prices set for', key);
        }

    });
    Promise.all(promises).then(() => {
        console.log('Success')
    }).catch((e) => {
        console.log('error')

    });
}

console.log("end");