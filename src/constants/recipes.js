// Inbyggda go-to-rätter med ingredienser
export const DEFAULT_RECIPES = [
  {
    id: 'tacos',
    name: 'Tacos',
    ingredients: [
      { name: 'Tacoskal', amount: '1 förpackning', category: 'torrvaror' },
      { name: 'Köttfärs', amount: '500 g', category: 'kott' },
      { name: 'Tacokrydda', amount: '1 påse', category: 'kryddor' },
      { name: 'Sallad', amount: '1/2 huvud', category: 'gronsaker' },
      { name: 'Tomat', amount: '2 st', category: 'gronsaker' },
      { name: 'Creme fraiche', amount: '1 dl', category: 'mejeri' },
      { name: 'Salsa', amount: '1 burk', category: 'konserver' },
    ],
  },
  {
    id: 'spagetti_bolognese',
    name: 'Spagetti Bolognese',
    ingredients: [
      { name: 'Spagetti', amount: '400 g', category: 'torrvaror' },
      { name: 'Köttfärs', amount: '500 g', category: 'kott' },
      { name: 'Krossade tomater', amount: '2 burkar', category: 'konserver' },
      { name: 'Gul lök', amount: '1 st', category: 'gronsaker' },
      { name: 'Vitlök', amount: '3 klyftor', category: 'gronsaker' },
      { name: 'Olivolja', amount: '2 msk', category: 'kryddor' },
      { name: 'Parmesan', amount: '50 g', category: 'mejeri' },
    ],
  },
  {
    id: 'kycklinggryta',
    name: 'Kycklinggryta',
    ingredients: [
      { name: 'Kycklingfile', amount: '600 g', category: 'kott' },
      { name: 'Kokosmjölk', amount: '1 burk', category: 'konserver' },
      { name: 'Paprika', amount: '2 st', category: 'gronsaker' },
      { name: 'Gul lök', amount: '1 st', category: 'gronsaker' },
      { name: 'Currykrydda', amount: '2 tsk', category: 'kryddor' },
      { name: 'Ris', amount: '3 dl', category: 'torrvaror' },
    ],
  },
  {
    id: 'pannkakor',
    name: 'Pannkakor',
    ingredients: [
      { name: 'Mjöl', amount: '3 dl', category: 'torrvaror' },
      { name: 'Mjölk', amount: '6 dl', category: 'mejeri' },
      { name: 'Ägg', amount: '3 st', category: 'mejeri' },
      { name: 'Smör', amount: '50 g', category: 'mejeri' },
      { name: 'Salt', amount: '1 krm', category: 'kryddor' },
    ],
  },
  {
    id: 'laxpasta',
    name: 'Laxpasta',
    ingredients: [
      { name: 'Pasta', amount: '400 g', category: 'torrvaror' },
      { name: 'Lax', amount: '400 g', category: 'kott' },
      { name: 'Grädde', amount: '2 dl', category: 'mejeri' },
      { name: 'Spenat', amount: '100 g', category: 'gronsaker' },
      { name: 'Citron', amount: '1 st', category: 'gronsaker' },
      { name: 'Dill', amount: '1 kruka', category: 'gronsaker' },
    ],
  },
  {
    id: 'soppa',
    name: 'Grönsakssoppa',
    ingredients: [
      { name: 'Morot', amount: '3 st', category: 'gronsaker' },
      { name: 'Palsternacka', amount: '2 st', category: 'gronsaker' },
      { name: 'Potatis', amount: '4 st', category: 'gronsaker' },
      { name: 'Gul lök', amount: '1 st', category: 'gronsaker' },
      { name: 'Grönsaksbuljongtärning', amount: '2 st', category: 'kryddor' },
      { name: 'Grädde', amount: '1 dl', category: 'mejeri' },
    ],
  },
  {
    id: 'pizza',
    name: 'Hemmagjord pizza',
    ingredients: [
      { name: 'Pizzadeg (färdig)', amount: '1 förpackning', category: 'brod' },
      { name: 'Tomatsås', amount: '1 burk', category: 'konserver' },
      { name: 'Mozzarella', amount: '200 g', category: 'mejeri' },
      { name: 'Skinka', amount: '100 g', category: 'kott' },
      { name: 'Champinjoner', amount: '150 g', category: 'gronsaker' },
    ],
  },
];
