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
        max_length = max(ellipse_bounding_box(semi_major_axis, semi_minor_axis, arg))

    return {"max_length": max_length}

def process_maneuver_data(start_orbit: dict, end_orbit: dict) -> dict:
    # conversion to right primitives
    start_orbit["axis"] = int(start_orbit["axis"])
    start_orbit["ecc"] = float(start_orbit["ecc"])
    start_orbit["arg"] = math.radians(int(start_orbit["arg"]))

    end_orbit["axis"] = int(end_orbit["axis"])
    end_orbit["ecc"] = float(end_orbit["ecc"])
    end_orbit["arg"] = math.radians(int(end_orbit["arg"]))

    # both orbits are circular
    if (start_orbit["ecc"] == 0 and end_orbit["ecc"] == 0):
        start_orbit["start_arg"] = False
        start_orbit["end_arg"] = 0 # choice I made: start transfer at arg 0
        end_orbit["start_arg"] = normalize_angle((math.pi + start_orbit["arg"] - end_orbit["arg"])) # transfer_orbit arg and end_orbit start_arg depend on the start_orbit arg
        end_orbit["end_arg"] = False

        # transfer orbit (1)
        if(start_orbit["axis"] < end_orbit["axis"]):
            periapsis = start_orbit["axis"]
            apoapsis = end_orbit["axis"]

            arg = start_orbit["arg"] # transfer happens from start orbit
            start_arg = 0
            end_arg = math.pi
        else:
            periapsis = end_orbit["axis"]
            apoapsis = start_orbit["axis"]

            arg = (start_orbit["arg"] + math.pi) % (2 * math.pi)
            start_arg = math.pi
            end_arg = 0

        axis = (periapsis + apoapsis)/2
        ecc = (apoapsis - periapsis)/(periapsis + apoapsis)
        max_length = apoapsis * 2 # diameter of bigger circular orbit
        earth_pos = [0, 0] # since the biggest orbit will always be circular, earth should be in the middle of the canvas
        transfer_orbits = [{"axis": axis, "ecc": ecc, "arg": arg, "start_arg": start_arg, "end_arg": end_arg}]

        v1_init = math.sqrt((G * EARTH_MASS)/start_orbit["axis"]) # start_orbit velocity
        v1_final = math.sqrt((G * EARTH_MASS) * (2/start_orbit["axis"] - 1/axis)) # transfer_orbit velocity at the start of transfer
        v2_init = math.sqrt((G * EARTH_MASS) * (2/end_orbit["axis"] - 1/axis)) # transfer_orbit velocity at the end of transfer
        v2_final = math.sqrt((G * EARTH_MASS)/end_orbit["axis"]) # end_orbit velocity
        burns = [v1_final-v1_init, v2_final-v2_init]

        return {"start_orbit": start_orbit, "end_orbit": end_orbit, "transfer_orbits": transfer_orbits, "burns": burns, "max_length": max_length, "earth_pos": earth_pos}
    
    # start_orbit is circular, end_orbit is elliptical
    elif (start_orbit["ecc"] == 0): 

        end_orbit_periapsis  = end_orbit["axis"] * (1 - end_orbit["ecc"])
        end_orbit_apoapsis = end_orbit["axis"] * (1 + end_orbit["ecc"])
        end_orbit_semi_minor_axis = end_orbit["axis"] * math.sqrt(1 - (end_orbit["ecc"] ** 2))

        start_orbit["start_arg"] = False
        end_orbit["end_org"] = False

        # edge case where start_orbit and end_orbit intersets so only one burn is necessary
        if (start_orbit["axis"] == end_orbit_periapsis or start_orbit["axis"] == end_orbit_apoapsis): 
            
            # intersection at the end_orbit periapsis; test with axis=30,000, ecc=0 and axis=50,000, ecc=0.4
            if (start_orbit["axis"] == end_orbit_periapsis): 
                start_orbit["end_arg"] = end_orbit["arg"]
                end_orbit["start_org"] = 0 # periapsis

                # end_orbit (ellipse) bounds the start_orbit
                max_length = max(ellipse_bounding_box(end_orbit['axis'], end_orbit_semi_minor_axis, end_orbit['arg']))
                earth_x = (end_orbit['axis'] - end_orbit_periapsis) * math.cos(end_orbit['arg'])
                earth_y = (end_orbit['axis'] - end_orbit_periapsis) * math.sin(end_orbit['arg'])
                earth_pos = [earth_x, earth_y]

            # intersection at the end_orbit apoapsis; test with axis=28,000, ecc=0 and axis=20,000, ecc=0.4
            else:
                start_orbit["end_orbit"] = normalize_angle((end_orbit["arg"] + math.pi))
                end_orbit["start_org"] = math.pi #apoapsis

                # start_orbit (circle) bounds the end_orbit
                max_length = 2 * start_orbit["axis"] 
                earth_pos = [0, 0]

            v1_init = math.sqrt((G * EARTH_MASS)/start_orbit["axis"]) # start circular orbit speed is constant 
            v1_final = math.sqrt((G * EARTH_MASS)/(2/start_orbit["axis"]- 1/(2 * end_orbit["axis"]))) # v = math.sqrt(G*M(2/r - 1/a))
            burns = [v1_final - v1_init]
            transfer_orbits = []

            return {"start_orbit": start_orbit, "end_orbit": end_orbit, "transfer_orbits": transfer_orbits, "burns": burns, "max_length": max_length, "earth_pos": earth_pos}
        
        # Current strategy
        # burn at start_orbit when sat is at the end_orbit's mean anomalie of 0 
        # Wait till it goes to the end_orbit's apoapsis, then another final burn there
        start_orbit['end_arg'] = end_orbit['arg']
        end_orbit['start_arg'] = math.pi

        # transfer orbit (1)
        if (start_orbit['axis'] < end_orbit_apoapsis):
            start_arg = math.pi 
            end_arg = 0
            periapsis = start_orbit['axis']
            apoapsis = end_orbit_apoapsis
        else:
            start_arg = 0
            end_arg = math.pi
            periapsis = end_orbit_apoapsis
            apoapsis = start_orbit['axis']
        
        axis = (periapsis + apoapsis)/2
        ecc = (apoapsis - periapsis)/(periapsis + apoapsis)
        max_length = apoapsis * 2
        transfer_orbits = [{"axis": axis, "ecc": ecc, "arg": arg, "start_arg": start_arg, "end_arg": end_arg}]

        #v1, v2, burns and you're done

        return {"data": "nothing"}

    # start_orbit is elliptical, end_orbit is circular
    elif (end_orbit["ecc"] == 0):
        return {"data": "nothing"}
    
    # both orbits are elliptical
    else: 
        return {"data": "nothing"}
    
def ellipse_bounding_box(a, b, theta):
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
    
    return [abs(x_dx_0[0] - x_dx_0[1]), abs(y_dy_0[0] - y_dy_0[1])]

def normalize_angle(angle):
    return angle % (2 * math.pi)
