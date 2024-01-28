/* 
The script relies on a few presumptions - see README.md.

It first tries to get data from the whole range 0 -> 100_000.
If there are more products than we received (count < total) the script removes the highest price products (we don't know if we have all, we can't skip that price)
and it moves the minPrice pointer to the highest price.
This process continues until there are no more products (count === total).

Example:
1) fetch 0 -> 100_000
2) response with 1000 products (count < total), product prices are [1, 4, 5, ..., 120, 200, 200]
3) remove the [200, 200], add the rest to the products array
4) fetch 200 -> 100_000
5) response with products [200, 200, 200, 200, 250, 300] (count === total) => add to the product array
6) all products extracted => exit

Note: The script doesn't rely on the specified 1_000 threshold which could easily change over time and break the script.
*/

import {
    API_PARAMS,
    API_URL,
    MAX_PRICE,
    MIN_PRICE,
    PRICE_STEP,
} from "../constants";

type Product = {
    price: number;
};

type ApiResponse = {
    total: number;
    count: number;
    products: Product[];
};

const products: Product[] = [];

const url = new URL(API_URL);
url.searchParams.set(API_PARAMS.minPrice, `${MIN_PRICE}`);
url.searchParams.set(API_PARAMS.maxPrice, `${MAX_PRICE}`);

(async () => {
    try {
        while (true) {
            /* Fetch data */
            const response = await fetch(url);

            if (response.status !== 200) {
                // If we know different status codes that the API uses, we can handle them accordingly.
                throw new Error("Could not retrieve data from the API."); // We don't have to necessarily exit the script. If the service is unavailable we can instead implement for example a polling mechanism checking whether the service is back online.
            }

            const data: ApiResponse = await response.json();

            /* Handle: all entries received => break loop */
            if (data.count === data.total) {
                products.push(...data.products);
                break;
            }

            const currentHighestPrice = data.products.reduce((prev, curr) =>
                curr.price > prev.price ? curr : prev
            ).price;

            /* Handle: number of entries exceeds API's limit */
            if (
                currentHighestPrice ===
                Number(url.searchParams.get(API_PARAMS.minPrice))
            ) {
                // The edge case where there are exactly 1000 products is ignored. If it was important to handle this case we could possibly do an another fetch request where minPrice === maxPrice and if count === total we would know there is exactly 1000.
                console.warn(
                    `Could not extract all products for price ${currentHighestPrice}$. Number of products exceeds API's limit. Skipping to ${
                        currentHighestPrice + PRICE_STEP
                    }$.`
                );
                products.push(...data.products);
                url.searchParams.set(
                    API_PARAMS.minPrice,
                    `${currentHighestPrice + PRICE_STEP}`
                );
                continue;
            }

            /* Remove highest price products, continue loop */
            const filteredData = data.products.filter(
                (product) => product.price !== currentHighestPrice
            );

            products.push(...filteredData);

            url.searchParams.set(API_PARAMS.minPrice, `${currentHighestPrice}`);
        }

        /* Handle output */
        console.log(products); // for example write to a file
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error(err.message); // or log for example to Sentry
        }
    }
})();
