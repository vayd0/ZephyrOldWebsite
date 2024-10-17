function catCracks(Crack) {
    return Crack.find({})
    .then((data) => {
      const categorizedGames = {};
      const uniqueData = Array.from(new Set(data.map((a) => a.name))).map(
        (name) => {
          return data.find((a) => a.name === name);
        }
      );

      for (let i = 0; i < uniqueData.length; i++) {
        const game = uniqueData[i];

        if (game.categories !== undefined) {
          let categories = "";

          if (game.categories.includes(",")) {
            categories = game.categories.split(",");
          } else {
            categories = [game.categories];
          }
          if (Array.isArray(categories)) {
            for (let j = 0; j < categories.length; j++) {
              const category = categories[j].trim();
              if (!categorizedGames[category]) {
                categorizedGames[category] = [];
              }

              categorizedGames[category].push(game);
            }
          } else {
            const category = categories;
            if (!categorizedGames[category]) {
              categorizedGames[category] = [];
            }

            categorizedGames[category].push(game);
          }
        }
      }
      return categorizedGames;
    })
}

module.exports = { catCracks };
