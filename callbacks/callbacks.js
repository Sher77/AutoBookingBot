const { Driver, UserReservation } = require('../database/models');
const { InlineKeyboard } = require('grammy');
const { bookSeat } = require('../utils/utils');

const { createReservation } = require('../utils/utils');

const pickDriverCallback = async (data, ctx) => {
  if (data.startsWith('picked_driver_')) {
    const driverId = data.split('_')[2];

    try {
      const driver = await Driver.findOne({ driverId });

      if (!driver) {
        return ctx.reply('Водитель не найден');
      }

      const availableSeats = [];

      if (driver.seats.front) availableSeats.push('спереди');
      if (driver.seats.left) availableSeats.push('слева');
      if (driver.seats.center) availableSeats.push('посередине');
      if (driver.seats.right) availableSeats.push('справа');

      if (availableSeats.length === 0) {
        return ctx.reply('У выбранного водителя нет свободных мест!');
      }

      const bookKeyboard = new InlineKeyboard();

      availableSeats.forEach((seat) => {
        bookKeyboard.text(seat, `${seat}_${driver.driverId}`);
      });

      await ctx.reply(`Свободные места у ${driver.name}: `, {
        reply_markup: bookKeyboard,
      });
    } catch (err) {
      console.error('Ошибка при поиске водителей:', err);
      await ctx.reply('Произошла ошибка при поиске водителей.');
    }
  } else if (data.includes('_')) {
    const [seat, driverId] = data.split('_');

    const seatMapping = {
      спереди: 'front',
      слева: 'left',
      посередине: 'center',
      справа: 'right',
    };

    const englishSeat = seatMapping[seat];

    if (englishSeat) {
      try {
        await bookSeat(ctx, driverId, englishSeat, seat);

        const reservation = await createReservation(
          ctx.from.id,
          driverId,
          englishSeat
        );

        // await ctx.reply(`Вы успешно забронировали место ${seat} у водителя.`);
      } catch (err) {
        console.error('Ошибка при бронировании места:', err);
        await ctx.reply('Произошла ошибка бронирования места.');
      }
    }
  }
};

const cancelReservationCallback = async (data, ctx) => {
  if (data.startsWith('cancel_')) {
    const reservationId = data.split('_')[1];

    try {
      const reservation = await UserReservation.findById(reservationId);

      if (!reservation) {
        return ctx.reply('Бронирование не найдено.');
      }

      await UserReservation.findByIdAndDelete(reservationId);

      const driver = await Driver.findOne({ driverId: reservation.driverId });

      if (!driver) {
        return ctx.reply('Водитель не найден');
      }

      const seat = reservation.seat;

      driver.seats[seat] = true;
      driver.passengers[seat] = '';

      await driver.save();

      await ctx.reply(
        `Бронирование успешно отменено у водителя ${driver.name}`
      );
    } catch (err) {
      console.error('Ошибка при отмене бронирования:', err);
      await ctx.reply('Произошла ошибка при отмене бронирования.');
    }
  }
};

module.exports = { pickDriverCallback, cancelReservationCallback };
