require('dotenv').config();
const mongoose = require('mongoose');
const {
  pickDriverCallback,
  cancelReservationCallback,
} = require('./callbacks/callbacks.js');
const { v4: uuidv4 } = require('uuid');

const { showHelp } = require('./utils/utils.js');

const { InlineKeyboard, session } = require('grammy');

const { Driver, UserReservation } = require('./database/models.js');
const { commands } = require('./commands.js');

const startBot = (bot) => {
  bot.command('start', async (ctx) => {
    await ctx.reply(`
      Привет я AutoBookingBot! 👋

      Добро пожаловать в нашего бота для бронирования мест в машине. 🚗

      Вот что вы можете сделать:
      - Забронировать место
      - Просмотреть водителей
      - Отменить бронь

      Чтобы начать, выберите нужный пункт из меню или введите соответствующую команду. Если у вас есть вопросы, просто напишите, и мы поможем!

      Приятных поездок!
      
      `);
  });

  bot.command('help', async (ctx) => {
    showHelp(ctx);
  });

  bot.use(session({ initial: () => ({ step: 0, driverData: {} }) }));

  bot.command('my_reservations', async (ctx) => {
    try {
      const reservations = await UserReservation.find();

      const seatMapping = {
        front: 'спереди',
        left: 'слева',
        center: 'посередине',
        right: 'справа',
      };

      let response = '';

      for (const reservation of reservations) {
        const driver = await Driver.findOne({ driverId: reservation.driverId });

        if (driver) {
          response += `Водитель: ${driver.name}\nМашина: ${
            driver.car
          }\nМесто: ${seatMapping[reservation.seat]}\n\n`;
        } else {
          console.log(
            'Водитель не найден для бронирования с driverId:',
            reservation.driverId
          );
        }
      }

      if (response) {
        await ctx.reply(`Список броней:\n\n ${response}`);
      } else {
        await ctx.reply('У вас нет активных бронирований.');
      }
    } catch (error) {
      console.error('Ошибка при получении списка бронирований:', error);
      await ctx.reply('Произошла ошибка при получении списка бронирований.');
    }
  });

  bot.command('show_drivers', async (ctx) => {
    try {
      const drivers = await Driver.find();
      const driverList = drivers
        .map(
          (driver) =>
            `Имя: ${driver.name},\nТелефон: ${driver.phone},\nМашина: ${driver.car}, \nВозраст: ${driver.age}`
        )
        .join('\n\n');

      if (driverList.length === 0) {
        return ctx.reply(
          'К сожалению на данный момент нет свободных мест или водителей >_<'
        );
      }

      await ctx.reply(`Список водителей:\n\n${driverList}`);
    } catch (error) {
      console.error('Ошибка при получении списка водителей:', error);
      await ctx.reply('Произошла ошибка при получении списка водителей.');
    }
  });

  bot.command('book', async (ctx) => {
    const drivers = await Driver.find();

    const driversWithFreeSeats = drivers.filter((driver) => {
      return (
        driver.seats.front ||
        driver.seats.left ||
        driver.seats.center ||
        driver.seats.right
      );
    });

    if (driversWithFreeSeats.length === 0) {
      await ctx.reply(
        'К сожалению, нет доступных водителей со свободными местами.'
      );
      return;
    }

    const driversKeyboard = new InlineKeyboard();

    driversWithFreeSeats.forEach((driver) => {
      driversKeyboard
        .text(driver.name, `picked_driver_${driver.driverId}`)
        .row();
    });

    const message = await ctx.reply('Водители со свободными местами: ', {
      reply_markup: driversKeyboard,
    });

    ctx.session.lastMessageId = message.message_id;
  });

  bot.command('cancel_reservation', async (ctx) => {
    const userId = ctx.from.id;

    const reservations = await UserReservation.find({ userId });

    if (reservations.length === 0) {
      return ctx.reply('У вас нет активных броней.');
    }

    const seatMapping = {
      front: 'спереди',
      left: 'слева',
      center: 'посередине',
      right: 'справа',
    };

    const cancelKeyboard = new InlineKeyboard();

    for (const reservation of reservations) {
      const driver = await Driver.findOne({ driverId: reservation.driverId });

      if (driver) {
        cancelKeyboard
          .text(
            `Отменить бронь ${seatMapping[reservation.seat]} у ${driver.name}`,
            `cancel_${reservation._id}`
          )
          .row();
      } else {
        cancelKeyboard
          .text(
            `Отменить бронь ${
              seatMapping[reservation.seat]
            } у неизвестного водителя`,
            `cancel_${reservation._id}`
          )
          .row();
      }
    }

    await ctx.reply('Выберите бронирование для отмены: ', {
      reply_markup: cancelKeyboard,
    });
  });

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    cancelReservationCallback(data, ctx);

    pickDriverCallback(data, ctx);
  });

  bot.command('become_a_driver', async (ctx) => {
    await ctx.reply(
      'Если вы хотите стать водителем, ответьте на несколько вопросов!'
    );

    ctx.session.step = 1;
    ctx.reply('Введите ваше имя:');
  });

  bot.on(':text', async (ctx) => {
    const text = ctx.message.text;

    if (ctx.session.step === 1) {
      ctx.session.driverData.name = text;
      ctx.session.step = 2;
      return ctx.reply('Введите вашу машину: ');
    }

    if (ctx.session.step === 2) {
      ctx.session.driverData.car = text;
      ctx.session.step = 3;
      return ctx.reply('Введите ваш телефон:');
    }

    if (ctx.session.step === 3) {
      const driver = await Driver.findOne({ phone: text });

      if (driver) {
        ctx.session.step === 2;

        return ctx.reply(
          'Водитель с таким номером существует!\nВведите другой:'
        );
      }

      ctx.session.driverData.phone = text;
      ctx.session.step = 4;
      return ctx.reply('Введите ваш возраст:');
    }

    if (ctx.session.step === 4) {
      const age = parseInt(text, 10);

      if (isNaN(age)) {
        return ctx.reply('Возраст должен быть числом. Попробуйте снова: ');
      }

      ctx.session.driverData.age = age;
      ctx.session.driverData.driverId = uuidv4();

      const newDriver = new Driver(ctx.session.driverData);
      await newDriver.save();

      ctx.reply('Водитель успешно сохранен!');
      ctx.session.step = 0;
      ctx.session.driverData = {};
    }

    if (ctx.session.step === 'update_driver_info') {
      await ctx.reply('clksjcds');
    }
  });

  bot.api.setMyCommands(commands);

  bot.start();
};

module.exports = { startBot };
