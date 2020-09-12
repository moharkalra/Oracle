#include "Adafruit_Thermal.h"
#include <Adafruit_NeoPixel.h>
#include <ESP32Servo.h>
#include <Si4703_Breakout.h>
static const int numChars = 21600;
uint8_t receivedChars[numChars];

boolean newData = false;

#include <Wire.h>
#include "SoftwareSerial.h"
#define TX_PIN 18 // Arduino transmit  YELLOW WIRE  labeled RX on printer
#define RX_PIN 19 // Arduino receive   GREEN WIRE   labeled TX on printer
int LED = 25;
int MOTOR = 14;


int resetPin = 23;
int SDIO = 21;
int SCLK = 22;
Si4703_Breakout radio(resetPin, SDIO, SCLK);
SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial); 
Servo servo;
Adafruit_NeoPixel pixels(5, LED, NEO_GRB + NEO_KHZ800);

void setup() {

    Serial.begin(115200);
    pinMode(7, OUTPUT); 
    digitalWrite(7, LOW);
  
    pinMode(LED, OUTPUT);
    pixels.begin();
    radio.powerOn();
    radio.setChannel(939);
    radio.setVolume(0);

  // NOTE: SOME PRINTERS NEED 9600 BAUD instead of 19200, check test page.
    mySerial.begin(19200);  // Initialize SoftwareSerial
  //Serial1.begin(19200); // Use this instead if using hardware serial
    printer.begin(255);    
}

void loop() {
    recvWithStartEndMarkers();
    showNewData();
}

void recvWithStartEndMarkers() {
    static boolean recvInProgress = false;
    static int ndx = 0;
    char startMarker = '(';
    char endMarker = ')';
    uint8_t rc;
 
 // if (Serial.available() > 0) {
    while (Serial.available() > 0 && newData == false) {
        
        rc = Serial.read();
        
        if (recvInProgress == true) {
            
            if (rc != endMarker) {
                
                receivedChars[ndx] = rc;
                //Serial.write(receivedChars[ndx]);
                ndx++;
                if (ndx >= numChars) {
                    ndx = numChars - 1;
                }
            }
            else {
                ndx = 0;
                recvInProgress = false;
                
                newData = true;
            }
        }

        else if (rc == startMarker) {
            recvInProgress = true;
        }
    }
}

void showNewData() {
  
    if (newData == true) {
        radio.setVolume(12);
        delay(3000);
        ESP32PWM::timerCount[0]=4;
        servo.attach(MOTOR);
        servo.write(110);
        
        
        
        
        for(int i =0 ; i<21600; i++){
          Serial.write(receivedChars[i]);
        }
        Serial.write('\n');
        
        newData = false;
        //printer.printBitmap(360, 480, receivedChars, false);
        printWithLights();

        printer.feed(2);
        
        printer.setDefault();
        servo.write(90);
        servo.detach();
        pixels.clear();
        pixels.show();
        delay(3000);
        radio.setVolume(0);
    }
}
void printWithLights(){

  int b = 0;
  for(int i = 0; i<21600; i = i+1800){
    uint8_t subset[1800]; 
    int idx = 0;
    for (int j = 0; j<1800; j++){
 
      subset[j] = receivedChars[j+i];

    }
    b = lightPulse(b); 
    printer.printBitmap(360, 40, subset, false);
  }

}
int lightPulse(int b) {


    pixels.clear();
    pixels.show();
    uint32_t color;
    //delay(100);
    if (b==0){
      color = pixels.Color(127, 0, 255);
      servo.write(110);
    }
    else if (b ==1){
      color =  pixels.Color(200, 0, 0);
      servo.write(110);
    }
    else if(b==2){
      color =  pixels.Color(240, 110, 35);
      servo.write(110);
    }
    else{
      color =  pixels.Color(0, 0, 225);
      servo.write(110);
    }
    for(int i = 0; i<5; i++){
      pixels.setPixelColor(i, color);
    }
    pixels.show();   
            
    b = b+1;
    return b%4;
    
}
