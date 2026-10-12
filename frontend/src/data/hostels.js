export const hostels = [
  {
    id:"sunrise",
    name:"Sunrise Student Hostel",
    gender:"Boys",
    location:"Madhapur, Hyderabad",
    nearby:"IIIT Hyderabad",
    price:6500,
    available:13,
    rating:4.7,
    reviews:128,
    image:"img-sunrise",
    amenities:["WiFi","Food","CCTV","Laundry","Study Room","Parking"],
    description:"A comfortable, student-focused hostel in Madhapur with reliable WiFi, daily meals, CCTV, laundry and dedicated study areas. Close to colleges, offices and public transport.",
    rooms:[
      {type:"Single",capacity:1,price:9000,available:2},
      {type:"Double",capacity:2,price:6500,available:7},
      {type:"Triple",capacity:3,price:5500,available:4}
    ],
    menu:{Monday:"Idli · Rice & Dal · Roti & Curry",Tuesday:"Dosa · Rice & Sambar · Veg Biryani",Wednesday:"Upma · Rice & Dal · Chapati & Curry",Thursday:"Pongal · Rice & Sambar · Fried Rice",Friday:"Poha · Rice & Dal · Roti & Paneer"},
    reviewList:[
      {name:"Rahul",rating:5,text:"Good location and the food has improved a lot this semester."},
      {name:"Arjun",rating:4,text:"Clean rooms, decent WiFi and helpful staff."}
    ]
  },
  {
    id:"greenwood",
    name:"Greenwood Girls Residence",
    gender:"Girls",
    location:"Gachibowli, Hyderabad",
    nearby:"University of Hyderabad",
    price:7200,
    available:8,
    rating:4.8,
    reviews:96,
    image:"img-greenwood",
    amenities:["WiFi","Food","CCTV","Laundry","Study Room","Gym"],
    description:"A secure girls residence designed around student comfort, with 24/7 security, nutritious meals, quiet study spaces and easy access to universities.",
    rooms:[
      {type:"Single",capacity:1,price:9800,available:1},
      {type:"Double",capacity:2,price:7200,available:5},
      {type:"Triple",capacity:3,price:6200,available:2}
    ],
    menu:{Monday:"Dosa · Rice & Dal · Roti & Curry",Tuesday:"Idli · Rice & Sambar · Veg Pulao",Wednesday:"Poha · Rice & Dal · Chapati & Curry",Thursday:"Upma · Rice & Rasam · Noodles",Friday:"Pongal · Rice & Dal · Roti & Paneer"},
    reviewList:[
      {name:"Meghana",rating:5,text:"Very safe and clean. The location is excellent."},
      {name:"Priya",rating:5,text:"The staff responds quickly whenever there is an issue."}
    ]
  },
  {
    id:"urban-nest",
    name:"Urban Nest Student Living",
    gender:"Boys",
    location:"Kukatpally, Hyderabad",
    nearby:"JNTUH",
    price:5800,
    available:5,
    rating:4.5,
    reviews:74,
    image:"img-urban",
    amenities:["WiFi","Food","CCTV","Parking","Common Room","Laundry"],
    description:"Affordable student accommodation near JNTUH with flexible room options, meals, parking and common areas for residents.",
    rooms:[
      {type:"Single",capacity:1,price:8200,available:1},
      {type:"Double",capacity:2,price:5800,available:2},
      {type:"Triple",capacity:3,price:5000,available:2}
    ],
    menu:{Monday:"Idli · Rice & Dal · Roti",Tuesday:"Dosa · Rice & Sambar · Biryani",Wednesday:"Upma · Rice & Dal · Chapati",Thursday:"Poha · Rice & Curry · Fried Rice",Friday:"Pongal · Rice & Dal · Roti"},
    reviewList:[
      {name:"Sanjay",rating:4,text:"Good value for the price and close to college."},
      {name:"Kiran",rating:5,text:"The common room is a nice place to study with friends."}
    ]
  }
];