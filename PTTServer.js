var net = require('net');
var winston = require('winston');
var uti = require("./Util");
var ss = require("./literals/SystemSettings.js");
var clientList = [];
var fpm = require("./FlexPointMessages");
var clientIp;
var RequestType = require("./literals/RequestType");
var tXml;
var merchantName = "";
var PixelIp = "127.0.0.1";
var PixelPort = "5656";
var client = net.connect({port: PixelPort})



//Catch all errors that occur globally if they are not caught.
process.on("uncaughtException", function (err) {

    logger.error("Uncaught Exception: " + err);


});


if (process.argv[2] === "noLogging") {


    logger = module.exports = new (winston.Logger)({
        transports: []

    });

} else {


    logger = module.exports = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({

                colorize: 'all'


            }),
            new (winston.transports.DailyRotateFile)({

                filename: "Patt.log",
                prettyPrint: false,
                json: false,
                colorize: true


            })
        ]

    });

}


//License check
if (uti.licenseIsValid()) {

    merchantName = uti.licenseIsValid()[1];

} else {

    console.log("License doesn't exist or is corrupt!");
    process.exit("911");


}

//Set the request index.
ss.incrementRequestIndex(); //Will set to 1 if not set.




var server = net.createServer({ allowHalfOpen: true }, function (socket) {
    //Encode in plain text
    socket.setEncoding("utf8");
    

    //Log the clients Ip
    clientIp = socket.remoteAddress;


    //Push the socket reference on a stack to use later.
    clientList.push(socket);


    logger.info("Client Connected on Port#: " + socket.localPort + " IP: " + clientIp);


    //Get connections to the server
    this.getConnections(function (err, count) {
        if (err) {
            logger.error('error getting connections');
        } else {
            logger.info("Connections: count: " + count);
        }
    });


    //When data is received
    socket.on('data', function (data) {

        socket.write("\6");
        logger.info("Sent Ack message to pin pad");
        
        
        //Data if From Pixel.  Need to Parse.
        if((data.indexOf("<Response>") !== -1) && (data.indexOf("<TypeOfRequest>1</TypeOfRequest>") !== -1))
        {
            
            
            
            
        }
        
        if((data.indexOf("<Response>") !== -1) && (data.indexOf("<TypeOfRequest>2</TypeOfRequest>") !== -1))
        {
            
            
            
            
        }
        
        
        if((data.indexOf("<Response>") !== -1) && (data.indexOf("<TypeOfRequest>3</TypeOfRequest>") !== -1))
        {
            
            
            
            
        }
        
        if((data.indexOf("<Response>") !== -1) && (data.indexOf("<TypeOfRequest>4</TypeOfRequest>") !== -1))
        {
            
            
            
            
        }
        
        if((data.indexOf("<Response>") !== -1) && (data.indexOf("<TypeOfRequest>5</TypeOfRequest>") !== -1))
        {
            
            
            
            
        }
        
        
        
        
        
        //Data is from Pin pad so need to parse.
        if (data.indexOf("<ServerId>") === -1 && data.indexOf("<TicketRequest>") > -1) {

            //tell the pin pad server Id wasn't entered

            var errMsg = fpm.createTicketResponseError("No Server #!");

            fpm.calculateLRC(errMsg)
                .then(function (lrc) {

                    return String.fromCharCode(2) + errMsg.toString()
                        + String.fromCharCode(3) + lrc + String.fromCharCode(4);


                })
                .then(function (formatXml) {

                    uti.sendTicketResponseXmlToFPPinPad(formatXml, socket);
                    logger.info("Server didn't enter their number");


                })
                .catch(function (err) {

                    logger.error(err);

                });


        } else {


            var cData;

            uti.logIncomingConnection(data, socket)
                .then(function () {

                    return uti.cleanSpecialChars(data);

                })
                .then(function (cleanData) {

                    cData = cleanData;
                    logger.info("Special Chars cleaned");

                    return uti.getFpRequestType(cleanData);

                })
                .then(function (requestType) {

                    if (requestType === RequestType.FPTicketRequest) {

                        logger.info("Parsing a ticket request");
                        return uti.SendTicketRequestToPixel(cData, clientIp);

                    }

                    if (requestType === RequestType.FPPurchaseResponse) {


                        logger.info("Parsing a purchase response request");
                        return uti.parsePurchaseResponse(cData, clientIp, merchantName);


                    }
                    if (requestType === RequestType.FPTicketBalanceRequest) {

                        logger.info("Parsing a ticket balance request");
                        return uti.parseTicketBalanceRequest(cData, clientIp);

                    }

                })
                .then(function (reqMessage) {

                    logger.info(reqMessage);


                })
                .catch(function (error) {

                    logger.error(error);

                });


        }


    });


    //When connection ends
    socket.on('end', function () {

        logger.info('Client Successfully Disconnected');
        logger.info("Cleaning up old connection");
        clientList.splice(clientList.indexOf(socket), 1);


    });


    //When their is a connection error.
    socket.on('error', function (err) {
        logger.error("Connection Error: " + err);
    });


});


server.on('error', function (err) {
    logger.error("Server Error: " + err);
});


server.on("close", function () {


    logger.error("Client Disconnected!");
    server.end();
});

server.on("end", function () {


    logger.info("Client closed connection after comm completed");


});

server.listen(9999, function () {

    logger.info("Server is listening on port #: " + server.address().port);

});





