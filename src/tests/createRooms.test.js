const { uploadThumbnail, uploadImages, validateOwnerID } = require('../routes/rooms/createRoom');
const User = require('../models/Users'); // Import your Mongoose User model
const { readImages } = require('./utils/readImages');

jest.mock('../models/Users');
describe('Validate user', () => {
  test('user exists', async () => {
    User.exists.mockResolvedValueOnce({ '_id': 42, 'name': 'test' });

    const result = await validateOwnerID(42);
    expect(result).toBeNull();
  })

  test('user doesnt exist', async () => {
    User.exists.mockResolvedValueOnce(null);

    const result = await validateOwnerID(2);
    expect(result).toEqual( {'field': 'owner_id', 'message': 'wrong owner_id'} );
  })
})

jest.mock('../routes/uploadFile.js');
describe('File upload', () => {
  test('upload images', () => {
    const images = readImages(['src/tests/images/img1.jpg', 'src/tests/images/img2.jpg'])
    expect(uploadImages(images, 420)).resolves.toEqual([null, ['rooms/420/images/img1.jpg', 'rooms/420/images/img2.jpg']]);
  })

  test('upload thumbnail', () => {
    const image = readImages(['src/tests/images/thumbnail.jpg'])[0]
    expect(uploadThumbnail(image, 420)).resolves.toEqual([null, 'rooms/420/thumbnail/thumbnail.jpg']);
  })

  test('failed image upload', () => {
    const images = readImages(['src/tests/images/img1.jpg'])
    expect(uploadImages([images, 'images'], 420)).resolves.toEqual([{ error: { message: 'Error while saving the image' } }, null]);
  })

  test('failed thumbnail upload', () => {
    expect(uploadThumbnail(['images'], 420)).resolves.toEqual([{ error: { message: 'Error while saving the thumbnail' } }, null]);
  })

})