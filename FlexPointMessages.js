// JavaScript source code
"use strict";
var XmlWriter = require('xml-writer');
var Promise = require("bluebird");




/**
 *
 * @param data - data from maitred
 * @returns {*} - an xml string Ticket Response for Fp
 */
function createTicketResponse(data) {




    var xw = new XmlWriter(true);


    xw.startElement("TicketResponse");


    xw.startElement("Count");
    xw.text(data.ticketCount);
    xw.endElement();

    for (var i = 0; i < data.invoiceNumbers.length; i++) {

        xw.startElement("Ticket");

        xw.startElement("Type");
        xw.text(1);
        xw.endElement();


        //remove the decimal point

        data.amounts[i] = String(data.amounts[i]).replace(/\./g, "");
        xw.startElement("Amount");
        xw.text(data.amounts[i]);
        xw.endElement();


        xw.startElement("Number");
        xw.text(data.invoiceNumbers[i]);
        xw.endElement();

        xw.startElement("TableNumber");
        xw.text("Tbl# " + data.tableNumber);
        xw.endElement();


        xw.startElement("Name");

        //NOTE: Maitred is using the name to return a server number
        //because the pin pad doesn't pass the server number back
        //so it makes it difficult and error prone to try to find a check
        ///per server


        xw.text(data.serverName);
        xw.endElement();


        xw.endElement();


    }
    xw.endElement();


    return xw.toString();





}

/**
 *
 * @param errorFromPos - The text error returned from the pos when an error happens on the pos side.
 *
 */
function createTicketResponseError(errorFromPos) {


    var xw = new XmlWriter(true);


    xw.startElement("TicketResponse");
    xw.startElement("Error");
    xw.text(errorFromPos);
    xw.endElement();
    xw.endElement();


    return xw.toString();


}

function createTicketBalanceResponseError(errorFromPos) {

    var xw = new XmlWriter(true);


    xw.startElement("TicketBalanceResponse");
    xw.startElement("Error");
    xw.text(errorFromPos);
    xw.endElement();
    xw.endElement();


    return xw.toString();


}


/**
 *
 * @returns {string} - a formatted xml telling the flex point pin pad that no check was found. Note:
 * Not used because maitred passed it's own no invoices found message.
 */
function createTicketResponseForNotMatchingTicket() {


    var xw = new XmlWriter(true);

    xw.startElement("TicketResponse");
    xw.startElement("Count");
    xw.text("0");
    xw.endElement();
    xw.endElement();

    return addSpecialCharactersToXml(xw);


}


/**
 *
 * @param rawXmlToCalculate - The text xml file to be processed to calculate the Lrc
 * @returns {string} - A string value that represents the Lrc.
 */
function calculateLRC(rawXmlToCalculate) {

    return new Promise(function (resolve) {


        //Add special characters tot he plain xml for the calculation.
        var newXmlToCalculate = String.fromCharCode(2) + rawXmlToCalculate + String.fromCharCode(3);

        //Split xml to array of characters
        var alphaBuffer = newXmlToCalculate.split("");
        var charBuffer = [];
        var lrc = 0;

        //Convert to ascii char code
        alphaBuffer.forEach(function (char) {

            charBuffer.push(char.charCodeAt(0));


        });

        //Lrc calculation
        for (var i = 0; i < charBuffer.length; i++) {

            lrc ^= charBuffer[i];

        }

        resolve(String.fromCharCode(lrc));


    });


}


/**
 *
 * @param xml - The xml build by xml writer
 * @returns {string} - Return the full xml with special characters formatted correctly for the pin pad.
 */
function addSpecialCharactersToXml(xml) {

    return new Promise(function (resolve) {


        this.calculateLRC(xml.toString())
            .then(function (formattedXml) {
                resolve(formattedXml.toString());

            });


    });


}


function createTicketBalanceResponse(balance) {


    var xw = new XmlWriter(true);


    xw.startElement("TicketBalanceResponse");
    xw.startElement("Balance");
    xw.text(balance);
    xw.endElement();
    xw.endElement();


    return xw.toString();


}

module.exports = {

    createTicketResponse: createTicketResponse,
    createTicketResponseForNotMatchingTicket: createTicketResponseForNotMatchingTicket,
    createTicketResponseError: createTicketResponseError,
    calculateLRC: calculateLRC,
    createTicketBalanceResponse: createTicketBalanceResponse,
    createTicketBalanceResponseError: createTicketBalanceResponseError

};

