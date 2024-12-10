import math
import numpy as np

G = 6.67430e-11
EARTH_MASS = 5.972e24

def process_orbit_data(semi_major_axis: int, ecc: float, arg: int) -> dict:
    semi_major_axis = int(semi_major_axis)
    ecc = float(ecc)
    arg = math.radians(int(arg))

    if (ecc == 0 or arg % (math.pi/2) == 0):
        max_length = 2 * semi_major_axis
    else: 
        semi_minor_axis = semi_major_axis * ((1 - (ecc ** 2)) ** 0.5)
        max_length = max_side_ellipse_bounding_box(semi_major_axis, semi_minor_axis, arg)

    return {"max_length": max_length}

def process_maneuver_data(start_orbit: dict, end_orbit: dict) -> dict:
    start_orbit["axis"] = int(start_orbit["axis"])
    start_orbit["ecc"] = float(start_orbit["ecc"])
    start_orbit["arg"] = math.radians(int(start_orbit["arg"]))

    end_orbit["axis"] = int(end_orbit["axis"])
    end_orbit["ecc"] = float(end_orbit["ecc"])
    end_orbit["arg"] = math.radians(int(end_orbit["arg"]))

    # both orbits are circular
    if (start_orbit["ecc"] == 0 and end_orbit["ecc"] == 0):
        start_orbit["start_arg"] = False
        start_orbit["end_arg"] = 0 # start transfer at arg 0
        end_orbit["start_arg"] = (math.pi + start_orbit["arg"] - end_orbit["arg"]) % (2 * math.pi) # transfer_orbit arg and end_orbit start_arg depend on the start_orbit arg
        end_orbit["end_arg"] = False

        if(start_orbit["axis"] < end_orbit["axis"]):
            periapsis = start_orbit["axis"]
            apoapsis = end_orbit["axis"]

            arg = 0
            start_arg = 0
            end_arg = math.pi
        else:
            periapsis = end_orbit["axis"]
            apoapsis = start_orbit["axis"]

            arg = math.pi
            start_arg = math.pi
            end_arg = 0
        

        axis = (periapsis + apoapsis)/2
        ecc = (apoapsis - periapsis)/(periapsis + apoapsis)
        max_length = apoapsis * 2
        earth_pos = [0,0] # since the biggest orbit will always be circular, earth should be in the middle of the canvas

        transfer_orbits = [{"axis": axis, "ecc": ecc, "arg": arg, "start_arg": start_arg, "end_arg": end_arg}]
        v1 = math.sqrt((G * EARTH_MASS)/start_orbit["axis"]) # start_orbit velocity
        v2 = math.sqrt((G * EARTH_MASS) * (2/start_orbit["axis"] - 1/axis)) # transfer_orbit velocity at the start of transfer
        v3 = math.sqrt((G * EARTH_MASS) * (2/end_orbit["axis"] - 1/axis)) # transfer_orbit velocity at the end of transfer
        v4 = math.sqrt((G * EARTH_MASS)/end_orbit["axis"]) # end_orbit velocity
        burns = [v2-v1, v4-v3]

        return {"start_orbit": start_orbit, "end_orbit": end_orbit, "transfer_orbits": transfer_orbits, "burns": burns, "max_length": max_length, "earth_pos": earth_pos}

    else:
        return {"data": "nothing"}

def max_side_ellipse_bounding_box(a, b, theta):
    # finding min, max values of x, y of the ellipse using derivatives of parametric equations
    # this is done to perfectly fit the elliptical orbit in the simulation

    # parametric equations of ellipse
    # t represents eccentric anomaly technically here since an ellipse function is just a compressed/stretched circle function
    def x(t):
        return a * np.cos(theta) * np.cos(t) - b * np.sin(theta) * np.sin(t)
    def y(t):
        return a * np.sin(theta) * np.cos(t) + b * np.cos(theta) * np.sin(t)
    
    # function that returns the roots (t) of the derivatives of the parametric equations
    def dx_dt_0(k: int):
        return np.arctan(-b * np.tan(theta)/a) + k * np.pi
    def dy_dt_0(k: int):
        return np.arctan((b * np.cos(theta))/(a * np.sin(theta))) + k * np.pi
    
    x_dx_0 = [x(dx_dt_0(0)), x(dx_dt_0(1))]
    y_dy_0 = [y(dy_dt_0(0)), y(dy_dt_0(1))]
    
    return max(abs(x_dx_0[0] - x_dx_0[1]), abs(y_dy_0[0] - y_dy_0[1]))
