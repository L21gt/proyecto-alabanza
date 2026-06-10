const dotenv = require("dotenv");

// 1. Cargamos las variables originales de tu archivo .env
dotenv.config();

// 2. Modificamos ÚNICAMENTE el nombre de la base de datos agregándole "_test"
// Si tu BD se llama "alabanza", Jest ahora buscará "alabanza_test"
process.env.POSTGRES_DB = `${process.env.POSTGRES_DB}_test`;
