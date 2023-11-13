const express = require('express');
const { verifyJWT } = require('../middleware');
const Room = require('../../models/Rooms');
const User = require('../../models/Users');
const Reservation = require('../../models/Reservations')
const mongoose = require('mongoose')
const Joi = require('joi')

const router = express.Router();

// Room and User ID validation methods
const roomIDValidation = async (id) => {
    try {
        const roomExists = await Room.exists({ _id: id });
        if (!roomExists) throw 'Wrong room_id';
        return null;
    } catch {
        return { field: 'room_id', message: 'wrong room_id' };
    }
};

const userIDValidation = async (id) => {
    try {
        const userExists = await User.exists({ _id: id });
        if (!userExists) throw 'Wrong user_id';
        return null;
    } catch {
        return { field: 'user_id', message: 'wrong user_id' };
    }
};

// Creates a new reservation
router.post('/', verifyJWT, async (req, res) => {
    let errorMessages = { errors: [] }

    // Schema for validating request body
    const schema = Joi.object({
        room_id: Joi.string().hex().length(24).required(),
        user_id: Joi.string().hex().length(24).required(),
        reserved_from: Joi.date().iso().required(),
        reserved_to: Joi.date().iso().greater(Joi.ref('reserved_from')).required()
    });

    // Validate request body
    let { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        var errorFields = error.details.map(x => (x.path[0]));
        error.details.map(x => (errorMessages.errors.push({ 'field': x.path[0], 'message': x.message.replace(/"/g, '') })));
    }

    // Check whether specified User or Room exists
    if (!errorFields || !errorFields.includes('user_id')) {
        error = await userIDValidation(req.body.user_id);
        if (error) errorMessages.errors.push(error);
    } 
    if (!errorFields || !errorFields.includes('room_id')) {
        error = await roomIDValidation(req.body.room_id);
        if (error) errorMessages.errors.push(error);
    }

    // Send error messages
    if (errorMessages.errors.length > 0) {
        return res.status(422).send(errorMessages);
    }
    
    // https://stackoverflow.com/a/33210174
    const reservatioExists = await Reservation.exists({
        'room_id': req.body.room_id,
        $or: [{
            'reserved_to': { '$gte': req.body.reserved_from },
            'reserved_from': { '$lte': req.body.reserved_to }
        }]
    });

    //console.log(reservatioExists)
    if (reservatioExists) return res.status(409).send({ error: { message: 'Reservation for specified date already exists' }});

    // Create new reservation
    const newReservation = await Reservation.create({
        room_id: req.body.room_id,
        user_id: req.body.user_id,
        reserved_from: req.body.reserved_from,
        reserved_to: req.body.reserved_to
    });

    // Find the specified room 
    const room = await Room.findById(req.body.room_id);

    // Create notifications for the user and owner of the room 
    const userNoti = { 
        time: new Date(Date.now()), 
        type: 'new_booking',
        text: `You have just reserved a room, ${room.name} on ${room.address.street}!`, 
        reservation_id: newReservation._id
    };

    const ownerNoti = { 
        time: new Date(Date.now()), 
        type: 'booked_room',
        text: `Someone has just reserved your room, ${room.name} on ${room.address.street}!`, 
    };

    // Updates arrays in specified User, Room and Owner of the Room
    await User.findByIdAndUpdate(mongoose.Types.ObjectId(req.body.user_id), { $push: { active_reservations: newReservation._id, notifications: userNoti } });
    await User.findByIdAndUpdate(mongoose.Types.ObjectId(room.owner_id), { $push: { notifications: ownerNoti } });
    await Room.findByIdAndUpdate(mongoose.Types.ObjectId(req.body.room_id), { $push: { reservations: newReservation._id } });

    res.status(201).send(newReservation);
});

// module.exports = router;

module.exports = {
    router,
    roomIDValidation,
    userIDValidation
};