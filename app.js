const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const session = require("express-session");
const dotenv = require("dotenv");
const passport = require("passport");
const cors = require("cors");
const { sequelize } = require("./models");
const passportConfig = require("./passport");
const hashtagRouter = require("./router/hashtag");
const authRouter = require("./router/auth");
const searchRouter = require("./router/search");
const contributeRouter = require("./router/contribute");
const postRouter = require("./router/post");
const mypageRouter = require("./router/mypage");
const logger = require("./lib/logger");
const helmet = require("helmet");
const hpp = require("hpp");
const redis = require("redis");
const RedisStore = require("connect-redis")(session);
dotenv.config();
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD,
  legacyMode: true,
});

const app = express();
passportConfig();
app.set("port", process.env.PORT || 8001);

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("데이터베이스 연결 성공");
  })
  .catch((error) => {
    console.error(error);
  });

app.use(cors({ credentials: true, origin: process.env.FRONT_URL }));
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(hpp());
} else {
  app.use(morgan("dev"));
}
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
      httpOnly: true,
      secure: false,
    },
    store: new RedisStore({ client: redisClient }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/hashtag", hashtagRouter);
app.use("/auth", authRouter);
app.use("/search", searchRouter);
app.use("/contribute", contributeRouter);
app.use("/post", postRouter);
app.use("/mypage", mypageRouter);
app.use((req, res, next) => {
  const error = new Error(`${req.method}${req.url}라우터가 없습니다`);
  error.stauts = 404;
  logger.info("info");
  logger.error(error.message);
  next(error);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send("error");
});

app.listen(app.get("port"), () => {
  console.log(app.get("port"), "번 포트에서 대기중");
});
