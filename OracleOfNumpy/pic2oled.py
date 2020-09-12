#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
Picture to OLED screen (pic2oled)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Convert an image to a hexadecimal array for OLED screens.
Usage:
   >>> python pic2oled.py <filename>

The script outputs a C declaration of a static array. Code output may be easily
included in source code managed by the Arduino IDE.

See full documentation in README.md
:copyright: (c) 2015 by Jean-Yves VET.
:license: MIT, see LICENSE for more details.
"""

from __future__ import print_function
import sys, re, os
from PIL import Image


############################### Global Variables ###############################

oledWidth  =  360  # Number of pixel columns handled by the OLED screen
oledHeight =  480   # Number of pixel rows managed by the OLED screen
threshold  =  127  # Below this contrast value, pixel is considered as activated


################################## Functions ###################################

## Check arguments and image dimensions.
# @return An image object if nothing went wrong
def checkArgs():
    # Check number of arguments
    if len(sys.argv) == 2:
        # Try to open the image
        try:
            im = Image.open(sys.argv[1])
        except:
            print("Error: unable to open", sys.argv[1], file=sys.stderr)
            exit(-1)

        # Check image dimensions
        width,height = im.size
        if (width != oledWidth or height != oledHeight):
            print("Error: invalid picture dimensions (",
                width, "x", height, "), expected", oledWidth,
                "x", oledHeight, file=sys.stderr)
            exit(-1)

        return im
    else :
        print("Error: invalid number of arguments", file=sys.stderr)
        print("Usage:")
        print("python " + sys.argv[0] + " <filename>")
        exit(-1)


## Convert pixel values to bytes for OLED screens. In the same column, values in
#  consecutive rows (8 by 8) are aggregated in the same byte.
# @param pixels   Array containing pixel values
# @return An array containing the converted values
def convert(pixels) :
    data = [[0 for x in range(oledHeight)] for x in range(int(oledWidth/8))]

    for i in range(int(oledWidth/8)):
        for j in range(int(oledHeight)):
            for bit in range(8):
                data[i][j] |= (pixels[j][i*8 + bit] << bit)
            data[i][j] = reverseBits(data[i][j], 8)
    return data

def reverseBits(num,bitSize):

     # convert number into binary representation
     # output will be like bin(10) = '0b10101'
     binary = bin(num)

     # skip first two characters of binary
     # representation string and reverse
     # remaining string and then append zeros
     # after it. binary[-1:1:-1]  --> start
     # from last character and reverse it until
     # second last character from left
     reverse = binary[-1:1:-1]
     reverse = reverse + (bitSize - len(reverse))*'0'

     # converts reversed binary string into integer
     return int(reverse,2)

## Convert image to binary (monochrome).
# @param im   A picture opened with PIL.
# @return A binary array
def toBinary(im):


    # Allocate array to hold binary values
    binary = [[0 for x in range(oledWidth)] for x in range(oledHeight)]

    # Convert to binary values by using threshold
    for j in range(oledHeight):
        for i in range(oledWidth):
            value = im.getpixel((i, j))[0]
            # Set bit if the pixel contrast is below the threshold value
            binary[j][i] = int(value < threshold)

    return binary


## Format data to output a string for C array declaration.
# @param data   Array containing binary values
# @return A string containing the array formated for C code.
def output(data):


    # Generate the output with hexadecimal values
    s = "const char [] PROGMEM = {" + '\n'
    for j in range(int(oledHeight)):
        for i in range(int(oledWidth/8)):

            s += format(data[i][j], '#04x') + ", "
            if (i%16 == 15):
                s += '\n'
    s = s[:-3] + '\n};'

    return s


#################################### Main ######################################

if __name__ == '__main__':
    image = checkArgs()
    binary = toBinary(image)
    data = convert(binary)
    print(output(data))
