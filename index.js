const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const path = require("path");
const fetch = require("node-fetch");
const cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo");
const requestIP = require("request-ip");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT ?? 3000;

mongoose.set("strictQuery", false);
mongoose.set("strictQuery", false);
const connectDB = async () => {
  try {
    let x = await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MONGO: " + x.connection.host);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
      httpOnly: true,
    },
  })
);

// Modèle
const Crack = require("./models/Cracks");
const User = require("./models/Users");
const News = require("./models/News");

// Functions
const { catCracks } = require("./files/utils.js");

const keywords = [
  "Zephyr",
  "Zephyr Crack",
  "Crack",
  "Logiciel",
  "Jeu",
  "Games",
  "Free",
  "Download",
  "Télécharger",
  "Discord",
  "Software",
  "Gratuit",
  "Console",
  "Torrent",
];
Crack.find({})
  .then((res) => {
    res.forEach((data) => {
      keywords.push(data.name);
    });
    keywords.join(",");
  })
  .catch((err) => {
    console.error("Crack error: ", err);
  });

// Configuration d'EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser()); 
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
      httpOnly: true,
    },
  })
);

// Routes
app.get("/", async (req, res) => {
  res.render("index", {
    data: await catCracks(Crack),
    news: await News.find({}),
    user: req.session.user || null,
    keys: keywords,
  });
});

app.post("/", async (req, res) => {
  try {
    await News.findOneAndDelete({ title: req.body.data });
    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

app.get("/infos", async (req, res) => {
  const news = (await News.find({})).reverse();

  res.render("infos", {
    news: news,
    user: req.session.user || null,
    data: await catCracks(Crack),
    keys: keywords,
  });
});

app.get("/news", async (req, res) => {
  if (!req.session.user) return res.redirect("/");

  res.render("news", {
    user: req.session.user || null,
    data: await catCracks(Crack),
    keys: keywords,
  });
});

app.post("/news", async (req, res) => {
  if (!req.session.user) return res.redirect("/");
  const { title, description, link, username, avatar, linkName, linkUrl } =
    req.body;
  const ipAddress = requestIP.getClientIp(req);
  const newUpdate = new News({
    author: username.length > 0 ? username : "Zephyr Staff",
    avatar:
      avatar.length > 0
        ? avatar
        : "https://cdn.discordapp.com/attachments/1125767159965032480/1126216603005091931/image-removebg-preview_1.png",
    title: title,
    image: link.length > 0 ? link : "",
    description: description,
    link: {
      name: linkName,
      url: linkUrl,
    },
    date: new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }),
    by: ipAddress,
  });

  newUpdate
    .save()
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => console.log(err));
});

app.get("/discord", (req, res) => {
  res.redirect("https://discord.gg/4d5ZQu7jQh");
});

app.get("/login", async (req, res) => {
  res.render("login", {
    user: req.session.user,
    data: await catCracks(Crack),
    keys: keywords,
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.redirect("/login");

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) return res.redirect("/login");

  req.session.user = user;
  req.session.ip = requestIP.getClientIp(req); 
  req.session.loginDate = new Date(); 

  res.redirect("/panel");
});

app.get("/games", async (req, res) => {
  res.render("games", {
    data: await catCracks(Crack),
    user: req.session.user,
    keys: keywords,
  });
});

app.post("/games", (req, res) => {
  Crack.findOneAndDelete({ name: req.body.data })
    .then(() => {
      res.redirect("/games");
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/games/modify", async (req, res) => {
  const user = req.session.user;
  const gameData = await Crack.findOne({ name: req.body.data });
  if(!gameData) return res.redirect("/login");
  if (!user) {
    res.redirect("/login");
  } else if (!gameData) {
    alert("Donnée introuvée pour " + req.body.data);
  }

  res.render("modify.ejs", {
    game: gameData,
    user: req.session.user,
    keys: keywords
  });
});

app.post("/games/modify/update", async (req, res) => {
  const user = req.session.user;
  const gameData = await Crack.findOne({ name: req.body.data });

  if (!user) {
    res.redirect("/login");
    return;
  }
  if (!gameData) {
    res.json({ error: "Donnée introuvée pour " + req.body.data });
    return;
  }

  const { gameName, gameURL, gameImage, gameDescription, games } = req.body;

  const newData = {};
  if (gameData.name !== gameName && gameName.trim() !== "") {
    newData.name = gameName;
  }
  if (gameData.url !== gameURL && gameURL.trim() !== "") {
    newData.url = gameURL;
  }
  if (gameData.image !== gameImage && gameImage.trim() !== "") {
    newData.image = gameImage;
  }
  if (
    gameData.description !== gameDescription &&
    gameDescription.trim() !== ""
  ) {
    newData.description = gameDescription;
  }
  if (
    !Array.isArray(gameData.categories) ||
    (gameData.categories.join(",") !== games && games.trim() !== "")
  ) {
    if (games && games.length > 0) {
      newData.categories = Array.isArray(games) ? games.join(",") : games;
    }
  }

  if (Object.keys(newData).length > 0) {
    await Crack.updateOne({ name: gameData.name }, newData);
  }

  let mention = "";
  let cat = Array.isArray(gameData.categories)
    ? gameData.categories.join(",")
    : gameData.categories;
  if (cat.toLowerCase().includes("logiciel")) {
    mention = "<@&1130560924126822400>";
  } else {
    mention = "<@&1130560822930849883>";
  }

  let params = {
    content: mention,
    embeds: [
      {
        title: gameData.name,
        url: gameData.url, 
        author: {
          name: "[ Nouvelle mise à jour ! ] ",
          url: gameData.url,
        },
        description: gameDescription.replace(/\/|\*\*(.*?)\*\*/g, ""),
        image: {
          url: gameData.image,
        },
        footer: {
          text: "Zephyr", 
        },
        fields: [
          {
            name: "Catégories",
            value: Array.isArray(gameData.categories)
              ? gameData.categories.join(" - ")
              : gameData.categories,
            inline: true,
          },
        ],
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: "Zephyr",
            style: 5,
            url: "https://zephyr.cyclic.app/",
          },
          {
            type: 2,
            label: "Télécharger",
            style: 5,
            url: gameData.url,
          }
        ],
      },
    ],
  };

  fetch(
    "https://discordapp.com/api/webhooks/1132781741334069289/YgDrv_DOB4SE89yx4RmMQnakVMh-sm0rB9zcsIthYs2IgmYX7Ku5KbD8vNlHvGYL1a8A",
    {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(params),
    }
  )
    .then((res) => {
      if (!res.ok) {
        console.error(`HTTP error! status: ${res.status}`);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    })
    .catch((err) => console.log(err));

  res.redirect("/games");
});

app.get("/panel", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("panel", {
    user: req.session.user || null,
    data: await catCracks(Crack),
    keys: keywords,
  });
});

app.post("/panel", async (req, res) => {
  const { gameName, gameURL, gameImage, gameDescription, games } = req.body;

  if (req.body.gameName.length <= 0) return;
  if (!games || games.length <= 0) games = "Inconnu";

  let cat = Array.isArray(games) ? games.join(",") : games;
  const newGame = new Crack({
    name: gameName,
    url: gameURL || "https://zephyr-crack.fr",
    image: gameImage,
    description: gameDescription.replace(/\/|\*\*(.*?)\*\*/g, ""),
    categories: cat,
    ip: requestIP.getClientIp(req)
  });

  let mention = "";
  if (cat.toLowerCase().includes("logiciel")) {
    mention = "<@&1130560924126822400>";
  } else {
    mention = "<@&1130560822930849883>";
  }

  newGame
    .save()
    .then(() => {
      res.redirect("/panel");
    })
    .catch((err) => console.log(err));

  let params = {
    content: mention,
    embeds: [
      {
        title: gameName,
        url: gameURL,
        author: {
          name: "[ Nouveau crack maintenant disponible ! ] ",
          url: gameURL,
        },
        description: gameDescription,
        image: {
          url: gameImage,
        },
        footer: {
          text: "Zephyr", 
        },
        fields: [
          {
            name: "Catégories",
            value: Array.isArray(games) ? games.join(" - ") : games,
            inline: true,
          },
        ],
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: "Zephyr",
            style: 5,
            url: "https://zephyr-crack.fr",
          },
          {
            type: 2,
            label: "Télécharger",
            style: 5,
            url: gameURL,
          },
        ],
      },
    ],
  };

  fetch(
    "https://discordapp.com/api/webhooks/1132446681921761281/4UI-rwx6MbEsSt9-Xu5Kvctmy-9LqdxjrK87bkuR5apZqGnJdATXtLkrp0tMJEZWsizH",
    {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(params),
    }
  )
    .then((res) => {
      if (!res.ok) {
        console.error(`HTTP error! status: ${res.status}`);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    })
    .catch((err) => console.log(err));
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("connect.sid");
  res.redirect("/");
});

connectDB().then(() => {
  if (process.env.NODE_ENV === "development") {
    app.listen(PORT, () => {
      console.log("Connecté: " + PORT);
    });
  }
});
