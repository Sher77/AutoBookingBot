const mongoose = require('mongoose');
const { UserReservation, Driver } = require('./models');

require('dotenv').config();

let db;

const connectToDb = async (dbName) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: dbName,
      connectTimeoutMS: 30000,
    });
    db = mongoose.connection;
  } catch (e) {
    console.error('Ошибка подключения: ', e.message);
    throw e;
  }
};

const getDb = () => {
  if (!db) {
    throw new Error(
      'Дата база не инициализирована! В первую очередь вызовите - connectToDb!'
    );
  }

  return db;
};

const clearReservations = async () => {
  try {
    const reservations = await UserReservation.find();

    const driverIds = reservations.map((reservation) => reservation.driverId);

    const drivers = await Driver.find({ driverId: { $in: driverIds } });

    await UserReservation.deleteMany({});

    for (const driver of drivers) {
      driver.seats = {
        front: true,
        left: true,
        center: true,
        right: true,
      };
      driver.passengers = {
        front: '',
        left: '',
        center: '',
        right: '',
      };
      await driver.save();
    }

    console.log('База данных успешно очищена!');
  } catch (err) {
    console.error('Ошибка очистки данных: ' + err);
  }
};

module.exports = { connectToDb, getDb, clearReservations };
