require('dotenv').config();
const mongoose = require('mongoose');
const cron = require('node-cron');

const { Bot } = require('grammy');
const { connectToDb, clearReservations } = require('./database/db.js');
const { startBot } = require('./bot');
const { hydrate } = require('@grammyjs/hydrate');

const start = async () => {
  try {
    await connectToDb('AutoBookingBot');
    console.log('Успешно подключено!');

    const bot = new Bot(process.env.BOT_API_KEY);

    bot.use(hydrate());

    startBot(bot);

    cron.schedule(
      '0 0 * * *',
      async () => {
        console.log('Запуск очистки базы данных:', new Date().toLocaleString());
        try {
          await clearReservations();
        } catch (error) {
          console.error('Ошибка при очистке базы данных:', error);
        }
      },
      {
        timezone: 'Asia/Almaty',
      }
    );
  } catch (e) {
    console.error(`Ошибка при запуске: ${e}`);
  }
};

start().catch(console.error);
