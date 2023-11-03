import { Query } from "appwrite";
import sdk, { Graphql, Models } from "node-appwrite";

const client = new sdk.Client();

client
  .setEndpoint("https://appwrite.wolframko.ru/v1")
  .setProject("65402d551911a17fc8fb")
  .setKey(
    "ced51ca79c8a17c504a30fd8f48e3a7f0499963f835d06628ae84815e47ad7d1a4782271c10e3af2c86eab120ac090b45605c72b55c5474ecc005520368e7ce61ddc21c428359de4e37a99356277f60b687e5c6c707275e4df15481def760ebd9e30af475764205b0440885faf5b92f9dfb832fca92568727f2143bc6557f636"
  );

const databases = new sdk.Databases(client);
const users = new sdk.Users(client);



// try {
//   await users.create('19216811',undefined, undefined, undefined, 'roman');
// } catch (e) {
//   const error = e as AppwriteException;
//   console.log(error.message);
// }

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



