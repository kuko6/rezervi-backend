const express = require('express');
const multer = require('multer');
const { verifyJWT } = require('../middleware');
const Room = require('../../models/Rooms');
const User = require('../../models/Users');
const mongoose = require('mongoose')
const { uploadFile } = require('../uploadFile');
// const Joi = require('joi')

const router = express.Router();
const upload = multer();

// Owner ID validation method
const validateOwnerID = async (id) => {
    try {
        const userExists = await User.exists({ _id: id });
        if (!userExists) throw 'Wrong user_id';
        return null;
    } catch {
        return { field: 'owner_id', message: 'wrong owner_id' };
    }
};

// Upload thumbnail
const uploadThumbnail = async (thumbnail, roomID) => {
    const imagePath = 'rooms/'+roomID+'/'+'thumbnail/'+thumbnail.originalname;
    const dataURL = await uploadFile(thumbnail, imagePath);
    if (dataURL == null) {
        return [{ error: { message: 'Error while saving the thumbnail' } }, null]
    }

    return [null, dataURL];
}

// Upload rest of the images
const uploadImages = async (images, roomID) => {
    let image_urls = [];
    for (const i in images) {
        const imagePath = 'rooms/'+roomID+'/'+'images/'+images[i].originalname;
        const dataURL = await uploadFile(images[i], imagePath);
        if (dataURL == null) {
            return [{ error: { message: 'Error while saving the image' } }, null]
        }
        image_urls.push(dataURL);
    }
    return [null, image_urls];
}

// Creates a new room
router.post('/', verifyJWT, upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'images', maxCount: 6 }]), async (req, res) => {
    let errorMessages = { errors: [] };
    if (req.body.json) req.body = JSON.parse(req.body.json);

    // Schema for validating request body
    const schema = Joi.object({
        name: Joi.string().required(),
        floor: Joi.number().required(),
        room_number: Joi.number().required(),
        info: Joi.string(),
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zip: Joi.string().required(),
        owner_id: Joi.string().hex().length(24).required(),
        number_of_seats: Joi.number().required(),
        amenities: Joi.array(),
    });

    // Validate request body
    let { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        var errorFields = error.details.map(x => (x.path[0]));
        error.details.map(x => (errorMessages.errors.push({ 'field': x.path[0], 'message': x.message.replace(/"/g, '') })));
    }

    if (!errorFields || !errorFields.includes('owner_id')) {
        error = await ownerIDValidation(req.body.owner_id);
        if (error) errorMessages.errors.push(error);
    } 

    // Send error messages
    if (errorMessages.errors.length > 0) {
        return res.status(422).send(errorMessages);
    }

    // Create a new room
    const newRoom = new Room({
        name: req.body.name,
        floor: req.body.floor,
        room_number: req.body.room_number,
        info: req.body.info,
        address: {
            street: req.body.street,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.zip
        },
        owner_id: req.body.owner_id,
        number_of_seats: req.body.number_of_seats,
        amenities: req.body.amenities
    });

    // Upload thumbnail
    if (req.files['thumbnail']) {
        [error, newRoom.thumbnail_url] = uploadThumbnail(req.files['thumbnail'][0]);
        if (error) {
            return res.status(500).send(error);
        }
    }
    
    // Upload rest of the images
    [error, newRoom.thumbnail_url] = uploadImages(req.files['images']);
    if (error) {
        return res.status(500).send(error);
    }

    // Save the new room to the database
    await Room.create(newRoom)

    // Add to active listings 
    await User.findByIdAndUpdate(mongoose.Types.ObjectId(req.body.owner_id), { $push: { active_listings: newRoom._id } });

    res.status(201).send(newRoom);
});

//module.exports = router;

module.exports = {
    router,
    uploadThumbnail,
    uploadImages,
    validateOwnerID
};