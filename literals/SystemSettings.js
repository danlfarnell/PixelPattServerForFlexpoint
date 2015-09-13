var storage = require("node-persist");
storage.initSync();


//TODO set a real path later once i know where it will be installed.

module.exports = {

    posType: {

        maitred: "Maitred",
        pixel: "pixel"

    },

    maitredIntPath: "C:\\Posera\\Maitred\\Data\\Int",

    maitredRequestFilePrefix: 'C:\\Posera\\Maitred\\data\\int\\Rptt',

    maitredIntBackUpPath: "C:\\Posera\\Maitred\\Data\\Int\\Backup",

    /**
     *
     * @returns The current requestIndex from local storage as a string
     */

    getCurrentRequestIndex: function () {




            if (isNaN(storage.getItem("requestIndex"))) {


                storage.setItem("requestIndex", 1);
            }


        return storage.getItem("requestIndex");


    },


    /**
     *  Sets the current request index.  If the index is not set will set it to 1.
     */
    incrementRequestIndex: function () {


        if (typeof storage.getItem("requestIndex") === 'undefined') {


            storage.setItem("requestIndex", 1);


        } else {

            var curIndex = Number(storage.getItem("requestIndex"));
            var newIndex = curIndex + 1;
            storage.setItem("requestIndex", newIndex);
            return "requestIndex is now " + newIndex;


        }



    }


};

