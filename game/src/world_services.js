const WorldServices = (() => {
  // Existing item slots, weapon skills, food keys and deed material IDs.
  const specialists = [
    { name: 'Weaponsmith', line: 'I sell swords and fencing blades.', gear: [['weapon', 'swords'], ['weapon', 'fencing']] },
    { name: 'Armourer', line: 'I deal in armour and shields.', gear: [['armor'], ['shield']] },
    { name: 'Fletcher', line: 'I have ranged weapons for sale.', gear: [['weapon', 'archery'], ['weapon', 'archery']] },
    { name: 'Bookseller', line: 'These pages belong to the Eighth Circle.', pages: true },
    { name: 'Apothecary', line: 'Take some herbs for the road. A draught will do more if you’re badly hurt.', sells: ['herbs'], tonic: true },
    { name: 'Baker', line: 'There’s dark bread and meat pie today.', sells: ['loaf', 'pie'] },
    { name: 'Fishmonger', line: 'I’ve set the larger fish apart on this tray.', sells: ['fish', 'bigfish'] },
    { name: 'Clothier', line: 'Have a look at the cloaks on the rack.', gear: [['cloak'], ['cloak']] },
    { name: 'Carpenter', line: 'Choose a timber or log house. I’ll write you a deed for the one you want.', materials: [1, 2] },
    { name: 'Stonemason', line: 'I sell deeds for stone houses. The prices include the stonework.', materials: [0] },
    { name: 'Jeweller', line: 'The rings are here and the charms next to them.', gear: [['ring'], ['charm']] },
    { name: 'Provisioner', line: 'I have food for the road and material for the workbench.', sells: ['cheese', 'apple', 'chicken'], mats: true },
  ];

  function ferryDestination(routes, ferry, position) {
    if (!ferry || ferry.kind !== 'ferry' || !position) return null;
    const { route, side, x, y, r } = ferry;
    if (side !== 'from' && side !== 'to') return null;
    if (Math.abs(position[0] - x) + Math.abs(position[1] - y) !== 1) return null;
    const crossing = routes.find(leg => leg.id === route);
    if (!crossing) return null;
    const origin = crossing[side];
    if (origin.r !== r || origin.at[0] !== x || origin.at[1] !== y) return null;
    return side === 'from' ? crossing.to : crossing.from;
  }

  return { specialists, ferryDestination };
})();

if (typeof module !== 'undefined') module.exports = WorldServices;
