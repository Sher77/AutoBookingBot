const { Schema, mongoose } = require('mongoose');

const DriverSchema = new Schema({
  driverId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  car: { type: String, required: true },
  age: { type: Number, required: true },
  seats: {
    front: { type: Boolean, default: true },
    left: { type: Boolean, default: true },
    center: { type: Boolean, default: true },
    right: { type: Boolean, default: true },
  },
  passengers: {
    front: { type: String, default: '' },
    left: { type: String, default: '' },
    center: { type: String, default: '' },
    right: { type: String, default: '' },
  },
});

const Driver = mongoose.model('Drivers', DriverSchema);

const UserReservationSchema = new Schema({
  userId: { type: String, required: true },
  driverId: { type: String, required: true },
  seat: {
    type: String,
    enum: ['front', 'left', 'center', 'right'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const UserReservation = mongoose.model(
  'UserReservation',
  UserReservationSchema
);

module.exports = {
  DriverSchema,
  Driver,
  UserReservationSchema,
  UserReservation,
};
