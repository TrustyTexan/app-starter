const gulp = require('gulp');
const Path = require('path');
const awspublish = require('gulp-awspublish');
const homedir = require('os-homedir');
const gutil = require('gulp-util');
const fs = require('fs');

// Load ENVIRONMENT variables from .env file
require('dotenv').config();

function getDeployEnv() {
    const env = gutil.env.env;
    if (!env) {
        throw new gutil.PluginError('publish', 'Must specify a deploy env (--env=<deploy_env>).');
    }
    return env;
}

function getS3Config() {
    let filePath = Path.join(homedir(), '.aws-creds.json');
    let configFile;
    try {
        configFile = fs.readFileSync(filePath);

    } catch(e) {
        throw new gutil.PluginError('publish', 'Must have a .aws-creds.json file in your home dir.')
    }

    let config;
    try {
        config = JSON.parse(configFile, { encoding: 'UTF-8' });

    } catch(e) {
        throw new gutil.PluginError('publish', 'Must have a properly formatted .aws-creds.json file in your home dir.')
    }
    return config;
}

gulp.task('publish', function () {
    // create a new publisher using S3 options
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
    const s3Config = getS3Config();
    const deployEnv = getDeployEnv();
    const appName = process.env.APP_NAME;
    if (!appName) {
        throw new gutil.PluginError('publish', 'Must set APP_NAME variable in .env file.'); 
    }
    // const finalPath = `${appName}/${deployEnv}/`;

    // Set all files to the proper env-based path

    // if () {
        
    // }
    // const s3BaseUrl

    const publisher = awspublish.create({
        accessKeyId: s3Config.key,
        secretAccessKey: s3Config.secret,
        params: {
            Bucket: s3Config.bucket
        }
    });

    // // define custom headers
    const headers = {
        'Cache-Control': 'max-age=315360000, no-transform, public'
    };

    return gulp.src('./build/static/**/*')
        // gzip, Set Content-Encoding headers and add .gz extension
        .pipe(awspublish.gzip({ ext: '.gz' }))

        // publisher will add Content-Length, Content-Type and headers specified above
        // If not specified it will set x-amz-acl to public-read by default
        .pipe(publisher.publish(headers))

        // create a cache file to speed up consecutive uploads
        // .pipe(publisher.cache())

        // print upload updates to console
        .pipe(awspublish.reporter());
});
