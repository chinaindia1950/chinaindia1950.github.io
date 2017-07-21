export { addNames };


const addNames = (cards) => {
    const names = ["Ye Seul", "Sheon", "옹성우", "Gal Gadot"];
    let min, max, random;

    const newCards = cards.map((card) => {
        random = Math.floor(Math.random() * 4);
        card.individuals = names[random];
    });

    console.log(newCards);

};