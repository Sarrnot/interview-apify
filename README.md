# Interview assignement

## General presumptions

-   The underlying data are coherent, not randomly generated.
-   The API does what it is supposed to according to the specified interface.
-   The data don't change in real time.
-   The solution doesn't have to scale, be easily customizable, etc.
-   This is the only way to get the data. We don't have access to the underlying database, we can't contact the provider to export the data for us, the API doesn't receive any other parameters that could help us, there is no other API more suited for our needs, etc. Why go the hard way when there could be an easier solution. ;-)
-   The price range is inclusive.
-   There are not so many products that we would run out of memory.
-   Smallest price step is 0.01$. (The exact number can be easily modified inside `constants.ts`.)
-   There is no unique identifier for the products. If we had one we don't have to use the 0.01$ price step. We could reduce the number of requests and post process the data removing duplicities.

## API's limitation

The 1000 limit can cause issues. When there would be more than 1000 products with the same price there is no way to extract all the products from the API. Unlike all the other presumptions which can be handled, this is an inherent limitation of the API (unless the products would get ordered randomly and we would create a loop iterating for so long until we find all entries).

Despite the possibility of not being able to extract all the products, we can handle this edge case on our side by for example skipping this price range and logging a warning (as seen in the solutions).

## Solution 1

A simple solution where the API is "friendly".

### Presumptions

-   Products contain their own price.
-   The API returns the first 1000 entries according to their price. (highest price products are cut off from the response)

## Solution 2

Solution where the API is not so well suited for scraping and we have to rely only on the product count.

The solution uses a variation on the binary search algorithm.

### Presumptions

-   Products either do NOT contain their own price or the API's limit does NOT cut off products based on their price.
