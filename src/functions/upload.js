const { app } = require('@azure/functions');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


// Set up multer for file upload handling
const upload = multer({ dest: 'uploads/' });

// Create the uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.http('upload', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (context, req) => {
        return new Promise((resolve, reject) => {
            upload.single('image')(req, context.res, async (err) => {
                if (err) {
                    context.log.error('Error uploading file:', err);
                    context.res.status = 500;
                    context.res.body = 'Error uploading file';
                    resolve();
                    return;
                }

                try {
                    const imagePath = req.file.path;

                    // Read the image file
                    const imageData = fs.readFileSync(imagePath);

                    // Azure Computer Vision API request
                    const response = await axios.post(`${process.env.AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/analyze`, imageData, {
                        params: {
                            visualFeatures: 'Tags',
                        },
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY,
                        },
                    });

                    // Log the tags received from Azure
                    const tags = response.data.tags;
                    context.log("Tags received from Azure:", tags);

                    // Define a list of car types
                    const carTypes = ['sedan', 'suv', 'coupe', 'convertible', 'hatchback', 'minivan', 'pickup truck', 'truck', 'station wagon', 'sports car', 'van', 'luxury car'];

                    // Extract car type from tags
                    const carType = tags.find(tag => carTypes.includes(tag.name));

                    // Clear the uploads directory
                    fs.readdir('uploads', (err, files) => {
                        if (err) throw err;

                        for (const file of files) {
                            fs.unlink(path.join('uploads', file), err => {
                                if (err) throw err;
                            });
                        }
                    });

                    context.res.status = 200;
                    context.res.body = { carType: carType ? carType.name : 'Unknown' };
                    resolve();
                } catch (error) {
                    context.log.error(error);
                    context.res.status = 500;
                    context.res.body = 'An error occurred';
                    resolve();
                }
            });
        });
    }
});
