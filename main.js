// main.js

let map;
let service;
let directionsService;
let directionsRenderer;
let currentIndex = 0;
let restaurants = [];
let likedRestaurants = [];
let userLocationMarker;
let userLocation = null; // Store user's location
let restaurantMarker = null; // Marker for the restaurant
let radiusCircle = null; // Circle representing the radius

// Get references to the distance slider and display elements
const distanceSlider = document.getElementById('distance');
const distanceValueDisplay = document.getElementById('distance-value');

// Update the displayed distance value when the slider changes
distanceSlider.addEventListener('input', () => {
  distanceValueDisplay.innerText = distanceSlider.value;
});

// Event listener for the Apply Filters button
document.getElementById('apply-filters').addEventListener('click', () => {
  // Get the selected distance and cuisine
  const distanceInput = distanceSlider.value;
  const cuisineInput = document.getElementById('cuisine').value;

  // Convert miles to meters
  const radius = parseFloat(distanceInput) * 1609.34;

  // Validate radius
  if (isNaN(radius) || radius <= 0) {
    alert('Please enter a valid distance in miles.');
    return;
  }

  // Update the search parameters
  searchNearbyRestaurants(userLocation, radius, cuisineInput);

  // Reset the restaurant index
  restaurants = [];
  currentIndex = 0;
});

// Event listener for the View Liked Restaurants button
document.getElementById('view-liked').addEventListener('click', () => {
  showLikedRestaurants();
});

// Event listener for the Close button in the liked restaurants modal
document.getElementById('close-liked').addEventListener('click', () => {
  document.getElementById('liked-restaurants-modal').style.display = 'none';
});

// Event listener for the Start Over button in Filters Section
document.getElementById('start-over-filters').addEventListener('click', () => {
  startOverFromFilters();
});

// Event listener for the Start Over button in Modal
document.getElementById('start-over-modal').addEventListener('click', () => {
  startOver();
});

function initMap() {
  console.log('Initializing map...');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        map = new google.maps.Map(document.getElementById('map'), {
          center: userLocation,
          zoom: 15,
        });

        // Use google.maps.Marker for user's location
        userLocationMarker = new google.maps.Marker({
          position: userLocation,
          map: map,
          title: 'You are here',
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          },
        });

        service = new google.maps.places.PlacesService(map);

        // Initialize directions service and renderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true, // We'll add custom markers
          map: map,
        });

        // Initial search with default parameters
        const radius = parseFloat(distanceSlider.value) * 1609.34;
        searchNearbyRestaurants(userLocation, radius);
      },
      (error) => {
        handleLocationError(true, error);
      }
    );
  } else {
    handleLocationError(false);
  }
}

function handleLocationError(browserHasGeolocation, error) {
  let message = browserHasGeolocation
    ? `Geolocation service failed: ${error.message}`
    : "Error: Your browser doesn't support geolocation.";
  alert(message);
}

function searchNearbyRestaurants(location, radius = 8046.72, cuisine = '') {
  console.log('Searching for nearby restaurants...');

  if (!location) {
    alert('User location not available.');
    return;
  }

  const request = {
    location: location,
    radius: radius,
    type: ['restaurant'],
  };

  // Add the cuisine as a keyword if provided
  if (cuisine && cuisine !== '') {
    request.keyword = cuisine;
  }

  // Remove existing circle if any
  if (radiusCircle) {
    radiusCircle.setMap(null);
  }

  // Draw the circle on the map
  radiusCircle = new google.maps.Circle({
    strokeColor: '#4285F4',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#4285F4',
    fillOpacity: 0.1,
    map: map,
    center: location,
    radius: radius,
  });

  // Clear previous restaurant marker and directions
  if (restaurantMarker) {
    restaurantMarker.setMap(null);
  }

  directionsRenderer.set('directions', null);

  service.nearbySearch(request, handleSearchResults);
}

function handleSearchResults(results, status) {
  console.log('Places API status:', status);
  console.log('Results:', results);

  if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
    restaurants = results;
    currentIndex = 0;
    showRestaurant();
  } else {
    alert('No restaurants found. Please try adjusting your filters.');
    console.error('Places Service Status:', status);
  }
}

function showRestaurant() {
  console.log('Current Index:', currentIndex);
  console.log('Restaurants Array:', restaurants);

  if (currentIndex >= restaurants.length) {
    // Automatically open the liked restaurants modal
    if (likedRestaurants.length > 0) {
      showLikedRestaurants();
    } else {
      alert('You have not liked any restaurants.');
    }
    return;
  }

  const restaurant = restaurants[currentIndex];
  console.log('Displaying Restaurant:', restaurant.name);

  // Hide reviews and reset toggle text
  document.getElementById('reviews-container').style.display = 'none';
  document.getElementById('toggle-reviews').innerText = 'Show Reviews';

  // Hide opening hours and reset toggle text
  document.getElementById('opening-hours').style.display = 'none';
  document.getElementById('toggle-hours').innerText = 'Show Opening Hours';

  // Hide menu and reset toggle text
  document.getElementById('menu-content').style.display = 'none';
  document.getElementById('toggle-menu').innerText = 'Show Menu';

  // Remove existing restaurant marker
  if (restaurantMarker) {
    restaurantMarker.setMap(null);
  }

  // Clear directions
  directionsRenderer.set('directions', null);

  // Define the request for getDetails
  const request = {
    placeId: restaurant.place_id,
    fields: [
      'name',
      'rating',
      'formatted_address',
      'photos',
      'reviews',
      'url',
      'user_ratings_total',
      'geometry',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'opening_hours',
      'editorial_summary',
    ],
  };

  // Make the getDetails request
  service.getDetails(request, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      // Update the UI with detailed information
      document.getElementById('restaurant-name').innerText = place.name || 'No name available';
      document.getElementById('rating-value').innerText = place.rating || 'N/A';
      document.getElementById('review-count').innerText = place.user_ratings_total || '0';
      document.getElementById('restaurant-address').innerText = place.formatted_address || 'No address available';

      // Display photo
      if (place.photos && place.photos.length > 0) {
        const photoUrl = place.photos[0].getUrl();
        document.getElementById('restaurant-photo').src = photoUrl;
      } else {
        document.getElementById('restaurant-photo').src =
          'https://via.placeholder.com/400x250?text=No+Image+Available';
      }

      // Display phone number
      const phoneElement = document.getElementById('restaurant-phone');
      if (place.formatted_phone_number) {
        phoneElement.innerText = `Phone: ${place.formatted_phone_number}`;
      } else {
        phoneElement.innerText = '';
      }

      // Display website
      const websiteElement = document.getElementById('restaurant-website');
      if (place.website) {
        websiteElement.href = place.website;
        websiteElement.innerText = 'Visit Website';
        websiteElement.style.display = 'block';
      } else {
        websiteElement.href = '#';
        websiteElement.innerText = '';
        websiteElement.style.display = 'none';
      }

      // Display 'About' information
      if (place.editorial_summary && place.editorial_summary.overview) {
        const aboutContainer = document.getElementById('about-container');
        const aboutText = document.getElementById('about-text');
        aboutText.innerText = place.editorial_summary.overview;
        aboutContainer.style.display = 'block';
      } else {
        document.getElementById('about-container').style.display = 'none';
      }

      // Display opening hours
      displayOpeningHours(place.opening_hours);

      // Display reviews (but hidden by default)
      displayReviews(place.reviews);

      // Update Google Maps link
      const mapsLink = document.getElementById('maps-link');
      mapsLink.href = place.url;
      mapsLink.target = '_blank';
      mapsLink.innerText = 'View on Google Maps';

      // Show the sidebar
      document.getElementById('restaurant-card').style.display = 'block';

      // Add click event to toggle reviews
      const toggleReviewsBtn = document.getElementById('toggle-reviews');
      // Remove existing event listener to prevent duplication
      toggleReviewsBtn.removeEventListener('click', toggleReviews);
      toggleReviewsBtn.addEventListener('click', toggleReviews);

      // Add click event to toggle opening hours
      const toggleHoursBtn = document.getElementById('toggle-hours');
      toggleHoursBtn.removeEventListener('click', toggleOpeningHours);
      toggleHoursBtn.addEventListener('click', toggleOpeningHours);

      // Show the menu toggle if website is available
      const menuContainer = document.getElementById('menu-container');
      const toggleMenuBtn = document.getElementById('toggle-menu');
      toggleMenuBtn.removeEventListener('click', toggleMenu);

      if (place.website) {
        menuContainer.style.display = 'block';
        toggleMenuBtn.addEventListener('click', toggleMenu);
      } else {
        menuContainer.style.display = 'none';
      }

      // Center the map on the restaurant's location
      map.panTo(place.geometry.location);

      // Add a marker for the restaurant
      restaurantMarker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: place.name,
      });

      // Display the route from user's location to the restaurant
      displayRoute(userLocation, place.geometry.location);
    } else {
      console.error('Place details request failed:', status);
      // If getDetails fails, proceed to the next restaurant
      currentIndex++;
      showRestaurant();
    }
  });
}

function displayReviews(reviews) {
  const reviewsContainer = document.getElementById('reviews-container');

  // Clear any existing reviews
  reviewsContainer.innerHTML = '';

  if (reviews && reviews.length > 0) {
    reviews.forEach((review) => {
      const reviewDiv = document.createElement('div');
      reviewDiv.className = 'review';

      // Reviewer name
      const author = document.createElement('p');
      author.className = 'review-author';
      author.innerText = review.author_name;

      // Rating
      const rating = document.createElement('p');
      rating.className = 'review-rating';
      rating.innerText = `Rating: ${review.rating}`;

      // Review text
      const text = document.createElement('p');
      text.className = 'review-text';
      text.innerText = review.text;

      // Assemble the review element
      reviewDiv.appendChild(author);
      reviewDiv.appendChild(rating);
      reviewDiv.appendChild(text);

      reviewsContainer.appendChild(reviewDiv);
    });
  } else {
    const noReviews = document.createElement('p');
    noReviews.innerText = 'No reviews available.';
    reviewsContainer.appendChild(noReviews);
  }
}

function displayOpeningHours(openingHours) {
  const openingHoursContainer = document.getElementById('opening-hours');
  openingHoursContainer.innerHTML = '';

  if (openingHours && openingHours.weekday_text) {
    openingHours.weekday_text.forEach((day) => {
      const dayElement = document.createElement('li');
      dayElement.innerText = day;
      openingHoursContainer.appendChild(dayElement);
    });

    // Show the toggle for opening hours
    const toggleHoursBtn = document.getElementById('toggle-hours');
    toggleHoursBtn.style.display = 'inline-block';
  } else {
    // Hide the toggle if opening hours are not available
    document.getElementById('toggle-hours').style.display = 'none';
    openingHoursContainer.style.display = 'none';
  }
}

function toggleOpeningHours() {
  const openingHoursContainer = document.getElementById('opening-hours');
  const toggleHoursBtn = document.getElementById('toggle-hours');

  if (
    openingHoursContainer.style.display === 'none' ||
    openingHoursContainer.style.display === ''
  ) {
    openingHoursContainer.style.display = 'block';
    toggleHoursBtn.innerText = 'Hide Opening Hours';
  } else {
    openingHoursContainer.style.display = 'none';
    toggleHoursBtn.innerText = 'Show Opening Hours';
  }
}

function toggleReviews() {
  const reviewsContainer = document.getElementById('reviews-container');
  const toggleReviewsBtn = document.getElementById('toggle-reviews');

  if (
    reviewsContainer.style.display === 'none' ||
    reviewsContainer.style.display === ''
  ) {
    reviewsContainer.style.display = 'block';
    toggleReviewsBtn.innerText = 'Hide Reviews';
  } else {
    reviewsContainer.style.display = 'none';
    toggleReviewsBtn.innerText = 'Show Reviews';
  }
}

function toggleMenu() {
  const menuContent = document.getElementById('menu-content');
  const toggleMenuBtn = document.getElementById('toggle-menu');
  const websiteUrl = document.getElementById('restaurant-website').href;

  if (
    menuContent.style.display === 'none' ||
    menuContent.style.display === ''
  ) {
    menuContent.innerHTML = `<p>Menu is available on the <a href="${websiteUrl}" target="_blank">restaurant's website</a>.</p>`;
    menuContent.style.display = 'block';
    toggleMenuBtn.innerText = 'Hide Menu';
  } else {
    menuContent.style.display = 'none';
    toggleMenuBtn.innerText = 'Show Menu';
  }
}

function displayRoute(origin, destination) {
  const request = {
    origin: origin,
    destination: destination,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
    } else {
      console.error('Directions request failed due to ' + status);
    }
  });
}

function handleLike() {
  likedRestaurants.push(restaurants[currentIndex]);
  currentIndex++;
  showRestaurant();
}

function handleDislike() {
  currentIndex++;
  showRestaurant();
}

function showLikedRestaurants() {
  const likedList = document.getElementById('liked-list');
  likedList.innerHTML = '';

  if (likedRestaurants.length > 0) {
    likedRestaurants.forEach((restaurant) => {
      const listItem = document.createElement('li');

      // Restaurant name
      const name = document.createElement('h3');
      name.innerText = restaurant.name;
      name.style.margin = '0 0 5px';

      // Rating
      const rating = document.createElement('p');
      rating.innerText = `Rating: ${restaurant.rating || 'N/A'}`;
      rating.style.margin = '0 0 5px';

      // Address
      const address = document.createElement('p');
      address.innerText = restaurant.vicinity || 'No address available';
      address.style.margin = '0';

      listItem.appendChild(name);
      listItem.appendChild(rating);
      listItem.appendChild(address);

      likedList.appendChild(listItem);
    });
  } else {
    const message = document.createElement('p');
    message.innerText = 'You have not liked any restaurants yet.';
    likedList.appendChild(message);
  }

  document.getElementById('liked-restaurants-modal').style.display = 'block';
}

function startOverFromFilters() {
  // Reset filters to default values
  distanceSlider.value = 5;
  distanceValueDisplay.innerText = 5;
  document.getElementById('cuisine').value = '';

  // Reset liked restaurants
  likedRestaurants = [];

  // Remove existing restaurant markers and circles
  if (restaurantMarker) {
    restaurantMarker.setMap(null);
  }
  if (radiusCircle) {
    radiusCircle.setMap(null);
  }

  directionsRenderer.set('directions', null);

  // Reset search
  const defaultRadius = parseFloat(distanceSlider.value) * 1609.34;
  searchNearbyRestaurants(userLocation, defaultRadius);
}

function startOver() {
  // Hide all sidebars and modals
  document.getElementById('restaurant-card').style.display = 'none';
  document.getElementById('liked-restaurants-modal').style.display = 'none';

  // Reset filters to default values
  distanceSlider.value = 5;
  distanceValueDisplay.innerText = 5;
  document.getElementById('cuisine').value = '';

  // Reset liked restaurants
  likedRestaurants = [];

  // Remove existing restaurant markers and circles
  if (restaurantMarker) {
    restaurantMarker.setMap(null);
  }
  if (radiusCircle) {
    radiusCircle.setMap(null);
  }

  directionsRenderer.set('directions', null);

  // Reset search
  const defaultRadius = parseFloat(distanceSlider.value) * 1609.34;
  searchNearbyRestaurants(userLocation, defaultRadius);
}
