"use strict"

var XmlWriter = require('xml-writer');
/**
 *
 * @param data - data from Flexpoint
 * @returns {*} - an xml Payment Request string for Pixel 
 */
function CreateApplyPaymentRequest(data) {

	var xw = new XmlWriter(true);

	xw.startElement("Request");

	xw.startElement("Amount");
	xw.text(); //Data goes here
	xw.endElement();

	xw.startElement("AuthCode");
	xw.text()//Data goes here
	xw.endelement();


	xw.startElement("EmployeeNum");
	xw.text();//Data goes here
	xw.endElement();


	xw.startElement("ManuallyEntered");
	xw.text();//Data goes here
	xw.endElement();

	xw.startElement("MethodNum");
	xw.text();//Data goes here
	xw.endElement();

	xw.startElement("TypeOfRequest");
	xw.text("1");
	xw.endElement();

	xw.startElement("Tip");
	xw.text();//Data goes here
	xw.endElement();

	xw.startElement("TransNum");
	xw.text();//Data goes here
	xw.endElement();


	xw.endElement();


	return xw.toString();


}



/**
 *
 * @param data - data from Flexpoint
 * @returns {*} - an xml string Get Payment Method Request for Pixel
 */
function CreateGetPaymentMethodRequest(data) {

	var xw = new XmlWriter(true);


	xw.startElement("Request");


	xw.startElement("TypeOfRequest");
	xw.text("2");
	xw.endElement();

	xw.endElement();


	return xw.toString();
}


/**
 *
 * @param data - data from Flexpoint
 * @returns {*} - an xml string Get Receipt Request for Pixel
 */
function CreateGetReceiptRequest(data) {

	var xw = new XmlWriter(true);


	xw.startElement("Request");

	xw.startElement("EmployeeNum");
	xw.text() //Employee Num here
	xw.endElement();

	xw.startElement("TypeOfRequest");
	xw.text("3")
	xw.endElement();

	xw.startElement("TransNum");
	xw.text() //TransNum here
	xw.endElement();

	xw.endElement();


	return xw.toString();

}


/**
 *
 * @param data - data from Flexpoint
 * @returns {*} - an xml string Open Transaction Request for Pixel
 */
function CreateOpenTransactionsRequest(data) {

	var xw = new XmlWriter(true);


	xw.startElement("Request");

	xw.startElement("TypeOfRequest");
	xw.text("4");
	xw.endElement();

	xw.startElement("TableNum");
	xw.text();//Data goes here
	xw.endElement();

	xw.endElement();

	return xw.toString();






}

/**
 *
 * @param data - data from Flexpoint
 * @returns {*} - an xml string Get Employee Number Request for Pixel
 */

function CreateGetEmployeeNumberRequest(data) {

	var xw = new XmlWriter(true);


	xw.startElement("Request");

	xw.startElement("ManuallyEntered");
	xw.text() //Number of employee if manually entered.
	xw.endElement();

	xw.startElement("TrackData");
	xw.text() //Number of employee if Swiped.
	xw.endElement();

	xw.startElement("TypeOfRequest");
	xw.text("5") //Number of employee if manually entered.
	xw.endElement();

	xw.endElement();


	return xw.toString();



}










