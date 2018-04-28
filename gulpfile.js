const gulp = require('gulp');
const Path = require('path');
const awspublish = require('gulp-awspublish');
const homedir = require('os-homedir');
const gutil = require('gulp-util');
const fs = require('fs');
const gRename = require('gulp-rename');

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
    const appName = process.env.REACT_APP_NAME;
    if (!appName) {
        throw new gutil.PluginError('publish', 'Must set REACT_APP_NAME variable in .env file.'); 
    }

    const accessKeyId = s3Config.key;
    if (!accessKeyId) {
        throw new gutil.PluginError('publish', 'Must set "key" attribute in your .aws-creds.json file.'); 
    }
    const secretAccessKey = s3Config.secret;
    if (!secretAccessKey) {
        throw new gutil.PluginError('publish', 'Must set "secret" attribute in your .aws-creds.json file.');
    }
    const s3Bucket = process.env.REACT_APP_S3_BUCKET;
    if (!s3Bucket) {
        throw new gutil.PluginError('publish', 'Must set "REACT_APP_S3_BUCKET" in your .env file.');
    }
    const publisher = awspublish.create({
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        params: {
            Bucket: s3Bucket
        }
    });

    // // define custom headers
    const headers = {
        'Cache-Control': 'max-age=315360000, no-transform, public'
    };

    return gulp.src('./build/static/**/*')
        // Set all files to the proper env-based destination path
        .pipe(gRename(function(path) {
            path.dirname = Path.join(`${appName}/${deployEnv}/`, path.dirname);
        }))

        // gzip, Set Content-Encoding headers
        // TODO: this zips all file types including images.  DON'T USE IMAGES IN YOUR APP :)`
        .pipe(awspublish.gzip())

        // publisher will add Content-Length, Content-Type and headers specified above
        // If not specified it will set x-amz-acl to public-read by default
        .pipe(publisher.publish(headers))

        // create a cache file to speed up consecutive uploads
        // .pipe(publisher.cache())

        // print upload updates to console
        .pipe(awspublish.reporter());
});
