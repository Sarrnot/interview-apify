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

class ApiScraper {
    private minPointer: number;
    private maxPointer: number;
    private maxThresholds: number[] = [];
    private products: Product[] = [];
    private cache: {
        threshold: number;
        overflow: number;
    }[] = [];

    constructor(
        private min: number,
        private max: number,
        private url: string,
        private priceStep: number
    ) {
        this.minPointer = min;
        this.maxPointer = max;
    }

    public async scrape() {
        while (true) {
            const data = await this.fetchData();

            /* Handle: number of entries exceeds API's limit */
            if (data.count < data.total) {
                const newThreshold = this.addThreshold(
                    this.minPointer,
                    this.maxPointer
                );

                if (newThreshold) {
                    this.cache.push({
                        threshold: this.maxPointer,
                        overflow: data.total - data.count,
                    });
                    this.maxPointer = newThreshold;
                    continue;
                } else if (this.minPointer !== this.maxPointer) {
                    this.maxPointer = this.minPointer;
                    continue;
                } else {
                    console.warn(
                        `Could not extract all products for price ${this.minPointer}$. Number of products exceeds API's limit. Skipping to the next price range.`
                    );
                }
            }

            /* Save products, update cache */
            this.products.push(...data.products);

            this.cache.forEach((entry) => (entry.overflow -= data.count));

            /* Handle: super rare edge case where last but one price step exceeded API's limit */
            if (
                this.maxThresholds.length === 0 &&
                this.minPointer === this.maxPointer &&
                this.minPointer !== this.max
            ) {
                this.maxThresholds.push(this.max);
            }

            /* Update minPointer */
            const nextThreshold = this.maxThresholds.pop();

            if (!nextThreshold)
                break; /* No more price ranges, all entries extracted => break loop. */

            this.minPointer =
                nextThreshold !== this.max
                    ? nextThreshold + this.priceStep
                    : nextThreshold;

            /* Remove unnecessary cache and thresholds */
            this.cache = this.cache.filter(
                (breakpoint) => breakpoint.threshold > this.minPointer
            );

            if (this.maxThresholds.at(-1) === this.minPointer) {
                this.maxThresholds.pop();
            }

            /* Update maxPointer */
            const optimalMax = this.cache.find(
                (breakpoint) => breakpoint.overflow <= 0
            )?.threshold;

            if (optimalMax) {
                this.maxPointer = optimalMax;
                /* Remove unnecessary thresholds */
                this.maxThresholds = this.maxThresholds.filter(
                    (threshold) => threshold >= optimalMax
                );
            } else {
                const newThreshold = this.addThreshold(
                    nextThreshold,
                    this.maxThresholds.at(-1) ?? this.max
                );

                if (newThreshold) {
                    this.maxPointer = newThreshold;
                } else {
                    this.maxPointer = this.minPointer;
                }
            }
        }

        return this.products;
    }

    private async fetchData() {
        const url = new URL(this.url);
        url.searchParams.set(API_PARAMS.minPrice, `${this.minPointer}`);
        url.searchParams.set(API_PARAMS.maxPrice, `${this.maxPointer}`);

        const response = await fetch(url);

        if (response.status !== 200) {
            // If we know different status codes that the API uses, we can handle them accordingly.
            throw new Error("Could not retrieve data from the API."); // We don't have to necessarily exit the script. If the service is unavailable we could instead implement for example a polling mechanism checking whether the service is back online.
        }

        const data: ApiResponse = await response.json();

        return data;
    }

    private addThreshold(min: number, max: number) {
        const newThreshold = (min + max) / 2;

        if (newThreshold - this.priceStep < min) {
            return null;
        }

        this.maxThresholds.push(newThreshold);

        return newThreshold;
    }
}

(async () => {
    try {
        const products = await new ApiScraper(
            MIN_PRICE,
            MAX_PRICE,
            API_URL,
            PRICE_STEP
        ).scrape();

        /* Handle output */
        console.log(products); // for example write to a file
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error(err.message); // or log for example to Sentry
        }
    }
})();
