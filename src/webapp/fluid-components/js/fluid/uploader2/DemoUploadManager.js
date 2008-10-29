/*global SWFUpload*/
/*global jQuery*/
/*global fluid_0_6*/

fluid_0_6 = fluid_0_6 || {};

(function ($, fluid) {

    /*********************
     * DemoUploadManager *
     *********************/
    
    var updateProgress = function (file, events, demoState) {
        if (demoState.shouldPause) {
            return;
        }
        
        demoState.bytesUploaded = Math.min(demoState.bytesUploaded + Math.min(demoState.chunkSize, file.size), file.size);
        events.onFileProgress.fire(file, demoState.bytesUploaded, file.size);
    };
    
    var startUploadingFile = function (that) {
        // Reset our upload stats for each new file.
        that.demoState.currentFile = that.queue.files[that.demoState.fileIdx];
        that.demoState.chunksForCurrentFile = Math.ceil(that.demoState.currentFile / that.demoState.chunkSize);
        that.demoState.bytesUploaded = 0;
        that.demoState.shouldPause = false;
        
        that.events.onFileStart.fire(that.demoState.currentFile);    
    };
    
    // Declare finishUploadingFile up front because of the circular references.
    var finishUploadingFile;
    
    var simulateUpload = function (that) {
        var file = that.demoState.currentFile;
        
        that.invokeAfterRandomDelay(function () {
            if (that.demoState.bytesUploaded < file.size) {
                updateProgress(file, that.events, that.demoState);
                simulateUpload(that);
            } else {
                finishUploadingFile(that, file);
            }
        });
    };
    
    finishUploadingFile = function (that, file) {
        var nextFile;
        
        file.filestatus = fluid.fileQueue.fileStatusConstants.COMPLETE;
        
        that.events.onFileSuccess.fire(file);
        that.invokeAfterRandomDelay(function () {
            that.demoState.fileIdx++;
            that.swfUploadSettings.upload_complete_handler(file); // this is a hack that needs to be addressed.
        });     
    };
    
    var pauseDemo = function (events, demoState) {
        demoState.shouldPause = true;
        
        // In SWFUpload's world, pausing is a combinination of an UPLOAD_STOPPED error and a complete.
        events.onUploadError.fire(demoState.currentFile, 
                                  SWFUpload.UPLOAD_ERROR.UPLOAD_STOPPED, 
                                  "The demo upload was paused by the user.");
        that.swfUploadSettings.upload_complete_handler(demoState.currentFile); // this is a hack that needs to be addressed.
    };
    
    var initDemoUploadManager = function (events, options) {
        // Instantiate ourself as a slightly modified ServerUploadManager.
        var that = fluid.swfUploadManager(events, options);
        fluid.mergeComponentOptions(that, "fluid.demoUploadManager", that.options);
        
        // Initialize state for our upload simulation.
        that.demoState = {
            fileIdx: 0,
            chunkSize: 200000
        };
        
        return that;
    };
       
    /**
     * The Demo Upload Manager derives from the standard Server Upload Manager, but simulates the upload process.
     * 
     * @param {Object} options configuration options
     */
    fluid.demoUploadManager = function (events, options) {
        var that = initDemoUploadManager(events, options);
        
        that.uploadNextFile = function () {
            startUploadingFile(that);
            simulateUpload(that);
        };
        
        /**
         * Cancels a simulated upload.
         * This method overrides the default behaviour in SWFUploadManager.
         */
        that.cancel = function () {
            pauseDemo(that.events, that.demoState);
        };
        
        /**
         * Invokes a function after a random delay by using setTimeout.
         * If the simulateDelay option is false, the function is invoked immediately.
         * 
         * @param {Object} fn the function to invoke
         */
        that.invokeAfterRandomDelay = function (fn) {
            var delay;
            
            if (that.options.simulateDelay) {
                delay = Math.floor(Math.random() * 1000 + 100);
                setTimeout(fn, delay);
            } else {
                fn();
            }
        };
        
        return that;
    };
    
    fluid.defaults("fluid.demoUploadManager", {
        simulateDelay: true 
    });
})(jQuery, fluid_0_6);