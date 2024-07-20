const { Driver } = require('../database/models');
const { UserReservation } = require('../database/models');

const showHelp = async (ctx) => {
  await ctx.reply(`
    Привет! Я бот для бронирования мест в машине на пути домой. Вот список доступных команд:
    
    /start - Запуск бота и начало взаимодействия
    /help - Показать это сообщение с описанием команд
    /book - Забронировать место в машине
    /become_a_driver - Стать водителем
    /show_drivers - Показать водителей
    /my_reservations - Показать ваши текущие бронирования
    /cancel_reservation - Отменить бронирование
    
    Для бронирования места используйте команду /book и следуйте инструкциям.
    
    Удачи и безопасных поездок!
      `);
};

const bookSeat = async (ctx, driverId, seat, ruSeat) => {
  try {
    const driver = await Driver.findOne({ driverId });

    if (!driver) {
      return ctx.reply('Водитель не найден!');
    }

    if (!driver.seats[seat]) {
      return ctx.reply('Место уже занято или недоступно!');
    }

    driver.seats[seat] = false;
    driver.passengers[seat] = ctx.from.username;

    await driver.save();

    await ctx.reply(
      `Место ${ruSeat} успешно забронировано у водителя ${driver.name}!`
    );
  } catch (err) {
    console.error('Ошибка при бронировании места:', err);
    await ctx.reply('Произошла ошибка при бронировании места.');
  }
};

const createReservation = async (userId, driverId, seat) => {
  try {
    const reservation = new UserReservation({
      userId: userId,
      driverId: driverId,
      seat: seat,
    });

    await reservation.save();
    console.log('Бронь успешно сохранена:', reservation);
    return reservation;
  } catch (err) {
    console.error('Ошибка при сохранении брони:', err);
    throw new Error('Произошла ошибка при сохранении брони.');
  }
};

module.exports = { showHelp, bookSeat, createReservation };
