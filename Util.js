/**
 * Created by danfarnell on 1/12/2015.
 */

var Promise = require("bluebird");
var us = require('underscore');
var winston = require('winston');
var XmlDoc = require("xmldoc").XmlDocument;
var fs = require("fs");
var fpm = require("./FlexPointMessages");
var storage = require("node-persist");
storage.initSync();
var ss = require("./literals/SystemSettings");
var cl = require("./literals/CardLanguage");
var ct = require("./literals/CardType");
var fpReqType = require("./literals/RequestType");
var logger;


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
/**
 *
 * @param xmlRawDataToClean - A raw data buffer array from the tcp socket.
 * @returns {bluebird} - A Promise used to chain functions.
 */
function cleanSpecialChars(xmlRawDataToClean) {


    xmlRawDataToClean = us.initial(xmlRawDataToClean, 4);
    xmlRawDataToClean = us.rest(xmlRawDataToClean, 1);
    xmlRawDataToClean = xmlRawDataToClean.join("");


    return xmlRawDataToClean;


}

function SendTicketRequestToPixel(dataFromPinPad, clientIP) {


    var result = new XmlDoc(dataFromPinPad);

    var serverId = result.childNamed("Login").firstChild.val;
    var tableNumber = result.childNamed("Ticket").val;


    var xmlToWrite = mdm.createInvoiceByTableRequest(clientIP, serverId, tableNumber);

    var curIndex = ss.getCurrentRequestIndex();
    logger.info("Current Index is: " + curIndex);


    mdm.writeXmlRequestForMaitred(curIndex, xmlToWrite);


    ss.incrementRequestIndex();

    return "PP==>MD InvoiceByTable Request Created : \n\n " + xmlToWrite + "\n";


}


function parsePurchaseResponse(dataFromPinPad, clientIP, merchantName) {


    var purchaseResponse = dataFromPinPad.substr(0, dataFromPinPad.indexOf("</PurchaseResponse>") + 19);
    var ticket = dataFromPinPad.substring(dataFromPinPad.indexOf("</PurchaseResponse>")
    + 21, dataFromPinPad.indexOf("</Ticket>") + 9);
    var pr = new XmlDoc(purchaseResponse);

    var pinpinMerchantName = pr.childNamed("Merchant").val;

    //Shut down Service if Merchant name from pin pad and Lic file don't match.
    if (pinpinMerchantName != merchantName) {

        logger.error("Wrong License for Account! Pin pad Merchant Name: " + pinpinMerchantName
            + " License Merchant Name: " + merchantName);

        process.exit(8686);

    }

    var tr = new XmlDoc(ticket);
    var pWaiterNumber = tr.childNamed("Name").val;
    var checkNumber = tr.firstChild.val;


    var tipAmount;
    var cType;
    var pAmount;

    //Note: If no tip then this tag will not show.  Also total will not show.
    try {

        tipAmount = addDecimalToNumber(pr.childNamed("TipAmount").val);
        pAmount = addDecimalToNumber(pr.childNamed("Total").val);
    } catch (error) {

        tipAmount = "0";
        pAmount = addDecimalToNumber(pr.childNamed("Amount").val);

    }


    if (pr.childNamed("Transaction").val === "Cash") {

        cType = pr.childNamed("Transaction").val;

    } else {
        cType = pr.childNamed("CardType").val;

    }


    var payments = [{
        PaymentNumber: 1,
        PaymentAmount: pAmount,
        TipsAmount: tipAmount,
        CardType: cType,
        CardLanguage: cl.English
    }];


    var paymentXmlObj = mdm.createPaymentXml(clientIP, pWaiterNumber, checkNumber, payments);

    var curInd = ss.getCurrentRequestIndex();


    mdm.writeXmlRequestForMaitred(curInd, paymentXmlObj);


    var newIndex = ss.incrementRequestIndex();
    logger.info("New requestIndex is: " + newIndex);

    return "PP==>MD Purchase Response Request Created : \n\n " + paymentXmlObj + "\n";


}

function parseTicketBalanceRequest(dataFromPinPad, clientIP) {



    //Get the check info to send to complete the balance request.

    var tbr = new XmlDoc(dataFromPinPad);

    var invoiceNumber = tbr.childNamed("Ticket").childNamed("Number").val;
    var waiterNumber = tbr.childNamed("Login").childNamed("ServerId").val;

    //Send a request to get the checks for the table.
    var xmlInvByNumber = mdm.createInvoiceByNumberRequest(clientIP, waiterNumber, invoiceNumber);


    var curIndex = ss.getCurrentRequestIndex();


    logger.info("currentIndex is " + curIndex);

    mdm.writeXmlRequestForMaitred(curIndex, xmlInvByNumber);

    ss.incrementRequestIndex();


    return "PP==>MD TicketBalance Request Created : \n\n " + xmlInvByNumber + "\n";

}


/**
 *
 * @param dataFromPinPad - The Data from the pin pad with all special characters stripped out.
 * @returns {*} - A promise
 */
function getFpRequestType(dataFromPinPad) {


    if (dataFromPinPad.indexOf(fpReqType.FPTicketRequest) !== -1) {

        return fpReqType.FPTicketRequest;
    }

    if (dataFromPinPad.indexOf(fpReqType.FPPurchaseResponse) !== -1) {

        return fpReqType.FPPurchaseResponse;
    }


    if (dataFromPinPad.indexOf(fpReqType.FPTicketBalanceRequest) !== -1) {

        return fpReqType.FPTicketBalanceRequest;

    }


}

/**
 *
 * @param path - The Path of the Answer file from maitred
 * @returns {bluebird} - A Promise used to chain functions.
 */
function readMaitredResponseFile(path) {


    return new Promise(function (resolve, reject) {

        logger.info("Reading Maitre'd Answer File: ");

        fs.readFile(path, 'utf8', function (err, data) {

            if (err) {
                Logger.error("Can't read Pos Request File : " + err);
                reject(err);
            } else {

                resolve(data);
            }

        });


    });


}


/**
 *
 * @param xmlRawData - A Answer file from maitred in string format.
 * @returns {bluebird} - A Promise used to chain functions.
 */
function buildObjectFromMDXml(xmlRawData) {


    var obj;

    var result = new XmlDoc(xmlRawData);
    //If an error message is sent from maitred don't bother processing the rest of the xml.
    //  Just pass the error object.
    if (result.childNamed("Error").val !== "") {

        obj = {
            errorResponse: true,
            paymentResponse: false,
            invoiceByTableResponse: false,
            invoiceByNumber: false,
            error: result.childNamed("Error").val,
            deviceID: result.childNamed("DeviceID").val
        }


    } else {

        if (result.childNamed("TransactionCode").val == "InvoiceByTable") {


            //get all arrays
            var invNumbers = [];
            var amounts = [];


            var invoices = result.childNamed("Invoices");

            invoices.eachChild(function (inv) {


                invNumbers.push(inv.childNamed("InvoiceNumber").val);
                amounts.push(inv.childNamed("InvoiceAmount").val);


            });

            obj = {
                errorResponse: false,
                paymentResponse: false,
                invoiceByTableResponse: true,
                invoiceByNumber: false,
                deviceIp: result.childNamed("DeviceID").val,
                ticketCount: invNumbers.length,
                invoiceNumbers: invNumbers,
                tableNumber: result.childNamed("TableNumber").val,
                amounts: amounts,
                serverName: result.childNamed("WaiterNumber").val,
                error: result.childNamed("Error").val,
                deviceID: result.childNamed("DeviceID").val

            }


        }

        if (result.childNamed("TransactionCode").val == "Payment") {

            if (result.childNamed("Result").val == "Success") {

                obj = {

                    errorResponse: false,
                    paymentResponse: true,
                    invoiceByTableResponse: false,
                    invoiceByNumber: false,
                    error: result.childNamed("Error").val,
                    deviceID: result.childNamed("DeviceID").val

                };

            }


        }

        if (result.childNamed("TransactionCode").val == "InvoiceNumber") {


            //Strip the decimal for FP
            var bal = result.childNamed("Invoices").childNamed("Invoice").childNamed("InvoiceAmount").val;
            bal = bal.toString();
            bal = bal.replace(".", "");


            obj = {

                errorResponse: false,
                paymentResponse: false,
                invoiceByTableResponse: false,
                invoiceByNumber: true,
                balance: bal,
                deviceID: result.childNamed("DeviceID").val


            }


        }


    }

    if (us.isEmpty(obj)) {
        var err = "Object built from incomming xml is empty.";
        logger.error(err);


    } else {
        logger.info("Successfully built xml object.");
        return obj;

    }


}


/**
 *
 * @param xmlObject - An object Created to pass to the function to create a TicketResponse Xml.
 * @returns {bluebird} - A Promise used to chain functions.
 */
function createFpResponseXml(xmlObject) {


    return new Promise(function (resolve) {


        if (xmlObject.error !== "") {


            fpm.createTicketResponseError(xmlObject.error);

            logger.error("Could not create TicketResponse Xml, object is empty");


        } else {

            var trXml = fpm.createTicketResponse(xmlObject);

            logger.info("TicketResponse Xml has been created");
            resolve(trXml);


        }


    });


}

/**
 *
 * @param xmlToSend - The Xml to send back to the FP pin pad.
 * @param clientToSendTo - The instance of the socket to send the xml.
 * @returns {bluebird} - A Promise used to chain functions.
 */
function sendTicketResponseXmlToFPPinPad(xmlToSend, clientToSendTo) {


    clientToSendTo.write(xmlToSend);
    logger.info(xmlToSend + "\n\n");
    logger.info("DataStream Ended");


}

/**
 *
 * @param dataRecieved - The tcp data from pin pad
 * @param client - a reference to the client connection
 * @returns {bluebird} - A Promise used to chain functions.
 */
function logIncomingConnection(dataRecieved, client) {


    return new Promise(function (resolve) {




        //Log the incomming Data from pin pad.
        logger.info("Verified data is received!");


        logger.info("Data from Pin pad: \n\n" + dataRecieved.toString() + "\n");
        logger.info("Bytes read: " + client.bytesRead);
        logger.info("DataStream Ended\n\n");

        resolve("Connection Logged");


    });


}

/**
 *
 * @returns {bluebird} - Returns a promise to get the current request index.
 */
function getCurrentRequestIndex() {


    storage.getItem("requestIndex", function (err, index) {

        if (err) {
            logger.error(err);
            reject(err);
        } else {

            index = index.toString();

            //Make the Index 6 digits
            while (index.length != 6) {

                index = "0" + index;

            }
            var msg = "Index reformatted to 6 digits";
            logger.info(msg);
            resolve(index);

        }


    });


}

/**
 *
 * @param file - The file to be deleted
 * @returns {*}
 */
function deleteProcessedAnswerFile(file) {


    fs.unlink(file, ss.maitredIntBackUpPath + file, function (err) {

        if (err) {

            logger.error(err);
        } else {

            logger.info(file + " deleted");

        }


    });


}

/**
 *
 * @param num - Number to add a decimal to
 * @returns {string} - A value representing money like 9.99
 */
function addDecimalToNumber(num) {

    num = num.toString();

    if (num.length < 2) {

        num = "0" + num;


    }


    var cents = num.substr(-2);
    var dollars = num.substr(0, num.length - 2);
    if (dollars == "") {
        dollars = "0";
    }

    return dollars + "." + cents;


}


function licenseIsValid() {


    var total = 1;

    //Read the file.

    var fileContents = fs.readFileSync("./software.lic", "utf8");
    var merchantName = fileContents.split("\n")[2];



    //Strip out the beginning and ending chars
    var keyToMatch = fileContents.charAt(0);

    var re = new RegExp(keyToMatch, "g");

    //Remove beginning and ending chars.
    var newFileContents = fileContents.replace(re, "");

    newFileContents = newFileContents.toString();
//Process file contents using alg and make sure keys match.
    for (var i = 0; i < newFileContents.length; i++) {


        total += newFileContents.charCodeAt(i);


    }

    while (total > 255) {


        total = total / 2;

    }


    var calChar = String.fromCharCode(total);

    if (calChar === keyToMatch) {
        //return merchant name for later check when pin pad sends back a purchase Response
        return [true, merchantName];
    }
    else {

        return false;

    }


}


module.exports = {

    cleanSpecialChars: cleanSpecialChars,
    getFpRequestType: getFpRequestType,
    readMaitredResponseFile: readMaitredResponseFile,
    buildObjectFromMDXml: buildObjectFromMDXml,
    createFpResponseXml: createFpResponseXml,
    sendTicketResponseXmlToFPPinPad: sendTicketResponseXmlToFPPinPad,
    logIncomingConnection: logIncomingConnection,
    getCurrentRequestIndex: getCurrentRequestIndex,
    deleteProcessedAnswerFile: deleteProcessedAnswerFile,
    SendTicketRequestToPixel: SendTicketRequestToPixel,
    parsePurchaseResponse: parsePurchaseResponse,
    parseTicketBalanceRequest: parseTicketBalanceRequest,
    licenseIsValid: licenseIsValid


};















