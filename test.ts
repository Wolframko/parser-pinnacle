import { Query } from "appwrite";
import sdk, { Graphql, Models } from "node-appwrite";

import { createDirectus, rest, staticToken } from '@directus/sdk';

const client = createDirectus('https://directus-d4os4g4.service.wolframko.ru/').with(staticToken('YHdtOO8q1uspML5GmsZj0NkxH6sDIrSm')).with(rest());


console.log("starting");


const newOdd = {
  time: new Date(Date.now()).toISOString(),
  map: 0,
  type: 'moneyline',
  prices: [
    {
      designation: 'home',
      price: 100
    },
    {
      designation: 'away',
      price: 200
    }
  ],
}

const testDoc = await databases.createDocument("parser", "matches", sdk.ID.unique(), {
    pinnacleId: 1581152632,
    pinnacleOdds: [
      newOdd
    ],
    teams: [ "Purple Haze", "NightRaid"],
    league: "CS2 - ESPORTS BATTLE",
    discipline: "cs2",
    pinnacleUpdate: new Date(Date.now()).toISOString()
});

const getDoc = await databases.listDocuments(
  'parser',
  'matches',
  [
    Query.equal('pinnacleId', 1581152632)
  ]
)

const graphql = new Graphql(client);
const query = graphql.mutation({
  query: gql`query GetMatch($pinnacleId: Int!) {
    matches(where: {pinnacleId: $pinnacleId}) {
      pinnacleId
      pinnacleOdds {
        time
        map
        type
        prices {
          designation
          price
        }
      }
      teams
      league
      discipline
    }
  }
`, variables = {
  pinnacleId: 1581152632
}})



const { data, loading, error } = useQuery(query, {variables});

console.log(getDoc.documents[0])



