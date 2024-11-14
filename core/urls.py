from django.urls import path
from .views import home, submit_orbit_form

urlpatterns = [
    path('', home, name='home'),
    path('submit-orbit-form/', submit_orbit_form, name='submit_orbit_form')
]
