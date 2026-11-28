# Two-body character art

This pass uses the approved lean man and woman with their original curly and tied-back hair. It contains tunic, split robe, leather, mail, standard plate and Knight’s Plate. Each outfit has 128 unique walk and run paintings across the two bodies, five painted views each for standing and sitting, and two separately painted frontal dolls. The renderer mirrors the appropriate half-stride and restores the anatomical grip after mirroring.

The color and finish-mask bands share each packed page. Cloth dye, leather and metal finishes, skin and hair color reuse the paintings. Fixed fittings keep their original paint. Held items, shields, jewelry and named slot items use the existing game catalog. Combat preserves the fitted 12-phase body poses and item sockets, with the two approved directional heads fitted where those poses are used with the standard appearances. The new side action sheets remain source studies. Named NPCs and saved alternate styles, builds and headwear retain their fitted appearances.

The fishing cast opens a query sheet. Production and gathering interactions also use their existing query interfaces. World workers that carry a book, hammer or staff keep those existing attachments. The production pass adds no new world interaction states.

## Rebuild and inspect

Run from the repository root with Node, Python and the packages in [requirements.txt](../requirements.txt). The source receipts in [sources.json](sources.json) identify the paintings and guides. The archived references are part of the input.

```sh
python character-studies/production/pack-movement.py work/painted-character-packet
python character-studies/production/install.py work/painted-character-packet
node arttools/check_packed_art.js
python character-studies/production/movement.py work/painted-character-review E
```

Substitute `SE`, `NE`, `N`, `S`, `W`, `SW` or `NW` for the last argument to capture that heading. The strict pack requires all outfit families, movement cells, everyday poses and dolls. The install writes the runtime index, WebP pages and the packed-art manifest. The initial pack adds approximately 4.6 MB of compressed art and keeps the fitted source and composed-frame cache limits. [Equipment coverage by stable ID](equipment-coverage.json) is regenerated with `node character-studies/production/inventory.cjs`.
