const API_URL =
    "https://api.apify.com/v2/datasets/VuFwckCdhVhoLJJ08/items?clean=true&format=json";

type Offer = {
    productId: string;
    offerId: string;
    price: string;
};

type ProductDictionary = { [productId: string]: Offer };

const priceConverter = (priceString: string) => {
    return Number(priceString.slice(1));
};

(async () => {
    const response = await fetch(API_URL);
    const data: Offer[] = await response.json();

    const productDict: ProductDictionary = {};

    data.forEach((offer) => {
        const newPrice = priceConverter(offer.price);
        const isNewPriceCheaper =
            priceConverter(productDict[offer.productId].price) > newPrice;

        if (!(offer.productId in productDict) || isNewPriceCheaper) {
            productDict[offer.productId] = { ...offer };
        }
    });

    const result = Object.values(productDict);

    console.log(result);
})();
