import fs from "fs";
import * as cheerio from "cheerio";

const html = fs.readFileSync(
  "importer/input/mymovies.html",
  "utf-8"
);

const $ = cheerio.load(html);

const rows = $("tr").toArray();

const items: {
  title: string;
  cover: string;
}[] = [];


for (let i = 0; i < rows.length - 1; i += 2) {

  const coverRow = $(rows[i]);
  const titleRow = $(rows[i + 1]);


  const covers = coverRow
    .find("td img")
    .map((_, img) => $(img).attr("src"))
    .get()
    .filter(src => src?.includes("/covers/"));


  const titles = titleRow
    .find("td span.walltext")
    .map((_, span) => $(span).text().trim())
    .get();


  const count = Math.min(covers.length, titles.length);


  for (let j = 0; j < count; j++) {

    items.push({
      title: titles[j],
      cover: covers[j]
    });

  }

}


console.log("Elementi trovati:", items.length);
console.log("-----------------------------");


items.forEach((item, index) => {

  console.log(`
${index + 1}
${item.title}

${item.cover}
-----------------------------
`);

});

fs.writeFileSync(
  "importer/input/covers.json",
  JSON.stringify(items, null, 2),
  "utf-8"
);

console.log("Creato importer/input/covers.json");