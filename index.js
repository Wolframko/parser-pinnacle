const Sentry = require("@sentry/node");
const { chromium } = require("playwright");
const InfluxDB = require('@influxdata/influxdb-client').InfluxDB;
const Point = require('@influxdata/influxdb-client').Point;
const { PrismaClient } = require('@prisma/client');
const beforeShutdown = require('./before-shutdown');
Sentry.init({
    dsn: "https://b5066f92465d4e02b0ed0ab8f91508c4@errors.wolframko.ru/1",

    // Performance Monitoring
    tracesSampleRate: 0.1, // Capture 100% of the transactions, reduce in production!
});

let prisma = new PrismaClient();

const express = require('express');
const app = express();
app.disable("x-powered-by");
const port = 4000;

let healthy = true;
app.get('/health', (req, res) => {
    if (healthy) {
        res.status(200).send('OK');
    } else {
        res.status(500).send();
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

let globalpage;



beforeShutdown(async function() {
    await browser.close();
})

async function startBrowser() {
    const browser = await chromium.connectOverCDP('ws://91.193.43.228:3092')
    const context = browser.contexts().length !== 0 ? browser.contexts()[0] : await browser.newContext();
    globalpage = await context.newPage();


    await globalpage.goto('https://www.pinnacle.com/en/esports/games/csgo/matchups', { waitUntil: 'commit' });

    await startParse();
}

startBrowser();
async function addOrUpdateMatch(item, transaction) {
    const matchId = item.id.toString();
    const startTime = new Date(item.startTime);
    const isLive = item.isLive;
    const league = item.league;
    const tournamentId = league.id.toString();
    const tournamentName = league.name;
    const participants = item.participants;

    const validDisciplines = ['Dota 2', 'CS:GO', 'League of Legends'];
    const discipline = validDisciplines.find((d) => tournamentName.startsWith(d));

    if (!discipline) {
        return;
    }

    await transaction.tournaments.upsert({
        where: { id: tournamentId },
        update: { name: tournamentName, updatedAt: new Date() },
        create: { id: tournamentId, name: tournamentName },
    });

    await transaction.matches.upsert({
        where: { id: matchId },
        update: { time_start: startTime, time_end: new Date(), isLive, updated: new Date(), tournamentId },
        create: {
            id: matchId,
            discipline: discipline,
            time_start: startTime,
            time_end: new Date(),
            isLive,
            tournamentId,
        },
    });

    for (const participant of participants) {
        const teamId = participant.name;
        const teamName = participant.name;

        await transaction.teams.upsert({
            where: { id: teamId },
            update: { name: teamName, updated: new Date() },
            create: { id: teamId, name: teamName },
        });

        await transaction.matches.update({
            where: { id: matchId },
            data: {
                teams: {
                    connectOrCreate: {
                        where: { id: teamId },
                        create: { id: teamId, name: teamName },
                    },
                },
            },
        });
    }
}

async function startParse() {
    globalpage.on('response', async (response) => {
        const url = response.url();

        if (url.includes('https://guest.api.arcadia.pinnacle.com/0.1/sports/12/markets/straight') ||
            url.includes('https://guest.api.arcadia.pinnacle.com/0.1/sports/12/matchups')) {

            try {
                const jsonResponse = await response.json();
                if (url.includes('markets')) {
                    saveToInfluxDB(filterData(jsonResponse));
                    console.log('markets');
                } else if (url.includes('matchups')) {
                    await prisma.$transaction(async (tx) => {
                        for (const matchup of jsonResponse) {
                            await addOrUpdateMatch(matchup, tx);
                        }
                    })
                    console.log('matchups');
                }

            } catch (error) {
                Sentry.captureException(error);
                console.log(error);
                healthy = false;
            }
        }
    });

}


const influxDB = new InfluxDB({
    url: 'http://91.193.43.228:8086',
    token: 'IIrT-p8S8mj008Mij6n6hCCMo62O2WSow-rV0oGNR089UI9tsvgCAL2sbfHs9o9zymbqzNMUxIgStUHgka4PSg==',
    timeout: 1000001,
});

const writeApi = influxDB.getWriteApi(
    'Prince',
    "matches"
);


function filterData(data) {

    let filteredData = [];
    data.forEach((data) => {
        const filteredObj = {
            key: data.key,
            matchupId: data.matchupId,
            period: data.period,
            status: data.status,
            prices: [],
            type: data.type
        }
        let prices = [];
        data.prices.forEach((priceObj) => {
            if (data.type === 'moneyline') {
                prices.push(
                    {
                        designation: priceObj.designation,
                        price: priceObj.price
                    }
                );
            }
            if (data.type === 'spread' || data.type === 'total') {
                prices.push(
                    {
                        designation: priceObj.designation,
                        points: priceObj.points,
                        price: priceObj.price
                    }
                );
            }
        })
        filteredObj.prices = prices;
        filteredData.push(filteredObj);

    })
    return filteredData;
}

function saveToInfluxDB(data) {
    let points = [];
    data.forEach((data) => {
        data.prices.forEach((priceObj) => {
            const point = new Point('bets')
                .tag('matchupId', String(data.matchupId))
                .tag('key', data.key)
                .tag('period', String(data.period))
                .tag('status', data.status)
                .tag('type', data.type)
                .tag('designation', priceObj.designation)
                .intField('price', priceObj.price);

            points.push(point);
        });

    })
    writeApi.writePoints(points);

    console.log('Data saved to InfluxDB');
}

