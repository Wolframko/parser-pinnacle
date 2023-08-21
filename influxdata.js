
async function fetchData() {
    // Define the Flux query to fetch the data
    const fluxQuery = `
    from(bucket: "matches")
      |> range(start: -1h) // adjust the time range as needed
      |> filter(fn: (r) => r._measurement == "bets")
      |> sort(columns: ["_time"], desc: true)
  `;

    return new Promise((resolve, reject) => {
        const data = [];

        queryApi
            .queryRows(fluxQuery, {
                next(row, tableMeta) {
                    // Process each row and add it to the data array
                    const obj = tableMeta.toObject(row);
                    data.push(obj);
                },
                error(error) {
                    console.error('Error querying data from InfluxDB', error);
                    reject(error);
                },
                complete() {
                    resolve(data);
                },
            });
    });
}

const queryApi = influxDB.getQueryApi('Prince');

