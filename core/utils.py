import math
import numpy as np

G = 6.67430e-11
EARTH_MASS = 5.972e24

def normalize_angle(angle):
    return angle % (2 * math.pi)

def process_orbit_data(semi_major_axis: int, ecc: float, arg: int) -> dict:
    semi_major_axis = int(semi_major_axis)
    ecc = float(ecc)
    arg = math.radians(int(arg))

    if (ecc == 0 or arg % (math.pi/2) == 0): # circle or horizontal/vertical ellipse
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
    
    # orbit stack
    orbits = [{start_orbit.copy()}]

    # burn stack
    burns = []

    def periapsis(orbit):
        return orbit["axis"] * (1 - orbit["ecc"])

    def apoapsis(orbit):
        return orbit["axis"] * (1 + orbit["ecc"])

    def eccentricity(periapsis, apoapsis):
        return (apoapsis - periapsis)/(apoapsis + periapsis)
    
    def axis(periapsis, apoapsis):
        return (periapsis + apoapsis)/2
    
    def isEqual(orbit1, orbit2):
        return orbit1["axis"] == orbit2["axis"] and orbit1["ecc"] == orbit2["ecc"] and orbit1["arg"] == orbit2["arg"]
    
    def velocity(r, semi_major_axis):
        return math.sqrt(G * EARTH_MASS * (2/r - 1/semi_major_axis))

    # Make apoapsis equal if they are not the same; first burn at the periapsis of orbits[-1]
    if (apoapsis(orbits[-1]) != apoapsis(end_orbit)):
        newOrbit = {}
        newOrbit["axis"] = axis(periapsis(orbits[-1]), apoapsis(end_orbit))
        newOrbit["ecc"] = eccentricity(periapsis(orbits[-1]), apoapsis(end_orbit))

        # if orbits[-1] is a circle, then do the rotation of the orbit and the same time of this burn
        if (periapsis(orbits[-1]) == apoapsis(orbits[-1])):
            orbits[-1]["end_arg"] = end_orbit["arg"]
            if (periapsis(orbits[-1]) <= apoapsis(end_orbit)): # newOrbit is a circle or newOrbit's periapsis and apoapsis stay on the same sides
                newOrbit["arg"] = end_orbit["arg"]
            else: # newOrbit's periapsis and apoapsis switch sides
                newOrbit["arg"] = normalize_angle(end_orbit["arg"] + math.pi)
        
        else:
            orbits[-1]["end_arg"] = 0
            if (periapsis(orbits[-1]) <= apoapsis(end_orbit)): # newOrbit is a circle or newOrbit's periapsis and apoapsis stay on the same sides
                newOrbit["arg"] = orbits[-1]["arg"]
            else: # newOrbit's periapsis and apoapsis switch sides
                newOrbit["arg"] = normalize_angle(orbits[-1]["arg"] + math.pi)

        if (periapsis(orbits[-1]) <= apoapsis(end_orbit)):
            newOrbit["start_arg"] = 0
        else:
            newOrbit["start_arg"] = math.pi

        v1 = velocity(periapsis(orbits[-1]), orbits[-1]["axis"])
        v2 = velocity(periapsis(orbits[-1]), newOrbit["axis"])
        burns.append(v2-v1)
        orbits.append(newOrbit)
    
    if (isEqual(orbits[-1], end_orbit)):
        return {"orbits": orbits, "burns": burns, "max_length": None, "earth_pos": None}
    
    # Make the orbit circular if needed to make arg the same later
    if (orbits[-1]["arg"] != end_orbit["arg"] and normalize_angle(orbits[-1]["arg"] + math.pi) != end_orbit["arg"] 
        and orbits[-1]["ecc"] != 0):

        newOrbit = {}
        newOrbit["axis"] = apoapsis(orbits[-1])
        newOrbit["ecc"] = 0
        newOrbit["arg"] = 0
        if (orbits[-1]["start_arg"] == 0): 
            orbits[-1]["end_arg"] = math.pi
            newOrbit["start_arg"] = normalize_angle(orbits[-1]["arg"] + math.pi)
        
        else:
            orbits[-1]["end_arg"] = 0
            newOrbit["start_arg"] = orbits[-1]["arg"]

        v1 = velocity(newOrbit["axis"], orbits[-1]["axis"])
        v2 = velocity(newOrbit["axis"], newOrbit["axis"]) # same r and a because circular orbit
        burns.append(v2-v1)
        orbits.append(newOrbit)

    if (isEqual(orbits[-1], end_orbit)):
        return {"orbits": orbits, "burns": burns, "max_length": None, "earth_pos": None}

    # Make the periapsis the same
    else:
        newOrbit = end_orbit.copy() # axis(periapsis(end_orbit), apoapsis(orbits[-1])), eccentricity(periapsis(end_orbit), apoapsis(orbits[-1]))
        newOrbit["start_arg"] = math.pi # always at apoapsis
        if (orbits[-1]["ecc"] == 0):
            orbits[-1]["end_arg"] = normalize_angle(end_orbit["arg"] + math.pi)
        else:
            if (abs(apoapsis(orbits[-1]) - apoapsis(end_orbit)) < abs(periapsis(orbits[-1]) - apoapsis(end_orbit))): 
            # apoapsis of orbits[-1] is equal to end_orbit apoapsis; this comparison is done instead of an equality check because of precision errors
                orbits[-1]["end_arg"] = math.pi
            else: # periapsis of orbits[-1] is equal to end_orbit apoapsis
                orbits[-1]["end_arg"] = 0

        v1 = velocity(apoapsis(end_orbit), orbits[-1]["axis"])
        v2 = velocity(apoapsis(end_orbit), end_orbit["axis"])
        burns.append(v2-v1)
        orbits.append(newOrbit)

    return {"orbits": orbits, "burns": burns, "max_length": None, "earth_pos": None}
    
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