/* 
The script relies on a few presumptions - see README.md.

It first tries to get data from the whole range 0 -> 100_000.
If there are more products than we received (count < total) the script narrows down the price range.
This process continues until it finds a range where we receive all the products for that range (count === total) and then moves to the next range.
If there are no more ranges to extract from the script exits.

Example:
1) fetch 0 -> 100_000
2) response with 1000 products (count < total).
3) fetch 0 -> 50_000.
4) response with 800 products (count === total) => add to the product array
5) fetch 50_000 -> 100_000
6) response with 1000 products (count < total)
7) fetch 50_000 -> 75_000
8) response with 700 products (count === total) => add to the product array
9) fetch 75_000 -> 100_000
10) response with 400 products (count === total) => add to the product array
11) no more price ranges to extract => exit

Note: The script doesn't rely on the specified 1_000 threshold which could easily change over time and break the script.
*/

import {
    API_PARAMS,
    API_URL,
    MAX_PRICE,
    MIN_PRICE,
    PRICE_STEP,
} from "../constants";

type Product = {};

type ApiResponse = {
    total: number;
    count: number;
    products: Product[];
};

const products: Product[] = [];

const url = new URL(API_URL);

const breakpoints: number[] = [];

let currentMin = MIN_PRICE;
let currentMax = MAX_PRICE;

(async () => {
    try {
        while (true) {
            /* Fetch data */
            url.searchParams.set(API_PARAMS.minPrice, `${currentMin}`);
            url.searchParams.set(API_PARAMS.maxPrice, `${currentMax}`);

            const response = await fetch(url);

            if (response.status !== 200) {
                // If we know different status codes that the API uses, we can handle them accordingly.
                throw new Error("Could not retrieve data from the API."); // We don't have to necessarily exit the script. If the service is unavailable we could instead implement for example a polling mechanism checking whether the service is back online.
            }

            const data: ApiResponse = await response.json();

            /* Handle: number of entries exceeds API limit */
            if (data.count < data.total) {
                if (currentMin !== currentMax) {
                    /* Narrow price range down */
                    const newBreakpoint = (currentMax + currentMin) / 2;

                    /* Handle: can't narrow down => try minPrice === maxPrice  */
                    if (newBreakpoint - PRICE_STEP < currentMin) {
                        currentMax = currentMin;
                        continue;
                    }

                    breakpoints.push(newBreakpoint);
                    currentMax = newBreakpoint;
                    continue;
                }

                console.warn(
                    `Could not extract all products for price ${currentMin}$. Number of products exceeds API's limit. Skipping to the next price range.`
                );
            }

            /* Extract products */
            products.push(...data.products);

            /* Move to the next price range */
            const newMin = breakpoints.pop();
            if (newMin === undefined)
                break; /* No more price ranges, all entries extracted => break loop. */

            currentMin = newMin;
            currentMax = breakpoints.at(-1) ?? MAX_PRICE;
        }

        /* Handle output */
        console.log(products); // for example write to a file
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error(err.message); // or log for example to Sentry
        }
    }
})();
