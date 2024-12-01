from django.urls import path
from .views import home, submit_orbit_form, submit_maneuver_form

urlpatterns = [
    path('', home, name='home'),
    path('submit-orbit-form/', submit_orbit_form, name='submit_orbit_form'),
    path('submit-maneuver-form/', submit_maneuver_form, name='submit_maneuver_form')
]
