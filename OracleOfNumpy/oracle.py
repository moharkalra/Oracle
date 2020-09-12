import cv2
import serial, struct
import numpy as np
import pic2oled as p
from time import sleep
from PIL import Image, ImageDraw, ImageFont
from matplotlib import cm
from socket import *
from re import *
import sys
import select
import os
import time
import threading

def process(clientSocket):
    #processes messages from clients and returns responses to clientSocket
    #passes in the client socket connected to the proxy

    #continuously running loop
    while True:
        try:
            #if a message is received and it is not empty
            message = clientSocket.recv(1024).decode()
            if message:
                print("Message from client: ", message)
                #server name, filepath and http version are extracted from client request
                domain = message.split('/')
                domain = domain[1]
                url = domain.upper()
                print("DOMAIN: " + domain)
                sendImage(url)


                clientSocket.close()

                print(" Client Connection closed")
            else:
                readable, writable, errorable = select([],[], [clientSocket])
                for s in errorable:
                    s.close()
                break
        except:
            #if the message has no content, connection to client is closed
            clientSocket.close()

            print("Client Connection closed")
            break
def sendImage(url):
    cam = cv2.VideoCapture(0)
    img_counter = 0
    ret, frame = cam.read()
    img_name = "opencv_frame_{}.png".format(img_counter)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    ret, bw = cv2.threshold(gray,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)

    imSmall = cv2.resize(bw, (480, 360))
    cv2.imwrite(img_name, imSmall)

    im = Image.fromarray(np.uint8(cm.gist_earth(imSmall)*255))
    postcard = Image.open("postcard.png")
    im.paste(postcard, (0, 0), postcard)


    fnt = ImageFont.truetype('lucon.ttf', 50)

    d = ImageDraw.Draw(im)
    d.text((25,100), url, font=fnt, fill=(255, 255, 255))
    d.text((30,95), url, font=fnt, fill=(0, 0, 0))
    im = im.transpose(method=Image.ROTATE_90)
    im.save('test.png')
    print("{} written!".format(img_name))
    # im = Image.open(img_name)
    binary = p.toBinary(im)
    data = p.convert(binary)
    #print(p.output(data))

    cam.release()

    ##### TRANSMISSION
    usbport = 'COM3'

    # Set up serial baud rate
    ser = serial.Serial(usbport, 115200, timeout=1)
    sleep(2)

    # for j in range(480):
    #     ser.write('<'.encode())
    #     txt = b''
    #     for i in range(45):
    #         txt += struct.pack('>B', data[i][j])
    #     print('Sending  "{}"'.format(txt))
    #     ser.write(txt)
    #     ser.write('>'.encode())
    #
    #     s = ser.readline()          # Get result from arduino
    #     print('Readback "{}"'.format(s))


    ser.write('('.encode())
    txt = b''
    for j in range(480):
        for i in range(45):
            txt += struct.pack('>B', data[i][j])
    print('Sending  "{}"'.format(txt))
    ser.write(txt)
    ser.write(')'.encode())
    sleep(0.1)
    s = ser.readline()         # Get result from arduino
    print('Readback "{}"'.format(s))


    #



    # ser.write('<!>'.encode())
    # s = ser.readline()          # Get result from arduino
    # print('Readback "{}"'.format(s))


def main():
    serverPort = 80

     # creates socket to listen for client requests
    listeningPort = 8081
    listeningAddr = ''  # localhost
    listeningSocket = socket(AF_INET, SOCK_STREAM)

    # Bind socket and listen to incoming connections
    listeningSocket.bind((listeningAddr, listeningPort))
    listeningSocket.listen(5)
    print('Listening on:', listeningPort);

    while True:
        # Accept incoming connections
        clientSocket, clientAddr = listeningSocket.accept() # returns tuple
        print("Connected to client on ", clientAddr)
        #creates a thread to handle the client request while allowing the main thread to still receive other client requests
        process(clientSocket)

    listeningSocket.close()
if __name__ == "__main__":
    main()
