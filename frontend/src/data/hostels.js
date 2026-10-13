const areas = [
  {
    name: "Dundigal",
    colleges: ["MLR Institute of Technology", "MLRIT"],
    nearby: "MLR Institute of Technology"
  },
  {
    name: "Medchal",
    colleges: ["CMR Institute of Technology", "CMRIT"],
    nearby: "CMR Institute of Technology"
  },
  {
    name: "Bachupally",
    colleges: ["VNR VJIET", "Malla Reddy University"],
    nearby: "VNR VJIET"
  },
  {
    name: "Kompally",
    colleges: ["Malla Reddy Engineering College", "MREC"],
    nearby: "Malla Reddy Engineering College"
  },
  {
    name: "Gachibowli",
    colleges: ["IIIT Hyderabad", "University of Hyderabad"],
    nearby: "IIIT Hyderabad"
  },
  {
    name: "Madhapur",
    colleges: ["IIIT Hyderabad", "HITEC City"],
    nearby: "HITEC City"
  },
  {
    name: "Kondapur",
    colleges: ["University of Hyderabad", "Gachibowli"],
    nearby: "University of Hyderabad"
  },
  {
    name: "Kukatpally",
    colleges: ["JNTUH", "VNR VJIET"],
    nearby: "JNTUH"
  }
];

const hostelNames = [
  "Sunrise Student Hostel",
  "Greenwood Student Residence",
  "Urban Nest Student Living",
  "Comfort Stay Hostel",
  "Royal Student Residency",
  "Happy Homes Hostel",
  "City View Student Hostel",
  "Dream Stay Residence"
];

const boysDescriptions = [
  "A comfortable student hostel with furnished rooms, daily meals, WiFi and dedicated study areas.",
  "Affordable accommodation for students with essential facilities and convenient transport access.",
  "A student-friendly residence offering flexible room options, meals and common areas.",
  "A convenient hostel for students with a focus on cleanliness, comfort and daily necessities."
];

const girlsDescriptions = [
  "A student residence designed for comfort, with security, meals and dedicated study spaces.",
  "A comfortable girls hostel offering furnished rooms, WiFi, housekeeping and convenient transport access.",
  "Affordable student accommodation with essential facilities and a peaceful study environment.",
  "A welcoming student residence with meal options, common facilities and secure entry."
];

const amenitiesList = [
  ["WiFi", "Food", "CCTV", "Laundry", "Study Room", "Parking"],
  ["WiFi", "Food", "CCTV", "Laundry", "Study Room", "Gym"],
  ["WiFi", "Food", "CCTV", "Parking", "Common Room", "Laundry"],
  ["WiFi", "Laundry", "Study Room", "Parking", "Power Backup"],
  ["WiFi", "Food", "CCTV", "Gym", "Common Room"],
  ["WiFi", "Food", "Laundry", "Study Room", "Power Backup"],
  ["WiFi", "Food", "CCTV", "Laundry", "Parking", "Common Room"],
  ["WiFi", "CCTV", "Laundry", "Study Room", "Gym", "Parking"]
];

const breakfastItems = [
  "Idli",
  "Dosa",
  "Upma",
  "Pongal",
  "Poha",
  "Chapati",
  "Puri",
  "Uttapam"
];

const lunchItems = [
  "Rice & Dal",
  "Rice & Sambar",
  "Rice & Rasam",
  "Veg Biryani",
  "Rice & Curry",
  "Veg Pulao",
  "Rice & Vegetables",
  "Curd Rice"
];

const dinnerItems = [
  "Roti & Curry",
  "Chapati & Curry",
  "Roti & Paneer",
  "Fried Rice",
  "Veg Biryani",
  "Dal & Chapati",
  "Noodles",
  "Rice & Curry"
];

const studentReviews = [
  {
    name: "Rahul",
    rating: 5,
    text: "Comfortable rooms and a convenient location for students."
  },
  {
    name: "Priya",
    rating: 4,
    text: "The facilities are useful and the staff is helpful."
  },
  {
    name: "Arjun",
    rating: 4,
    text: "Good accommodation with WiFi and study space."
  },
  {
    name: "Meghana",
    rating: 5,
    text: "The rooms are comfortable and the location is convenient."
  },
  {
    name: "Kiran",
    rating: 4,
    text: "A reasonable option for students looking for accommodation."
  },
  {
    name: "Sanjay",
    rating: 5,
    text: "The common areas are useful for studying and relaxing."
  }
];

const imageUrls = [
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1000&q=80"
];

const makeMenu = (index) => {
  return {
    Monday: `${breakfastItems[index % 8]} · ${lunchItems[index % 8]} · ${dinnerItems[index % 8]}`,
    Tuesday: `${breakfastItems[(index + 1) % 8]} · ${lunchItems[(index + 2) % 8]} · ${dinnerItems[(index + 3) % 8]}`,
    Wednesday: `${breakfastItems[(index + 2) % 8]} · ${lunchItems[(index + 3) % 8]} · ${dinnerItems[(index + 4) % 8]}`,
    Thursday: `${breakfastItems[(index + 3) % 8]} · ${lunchItems[(index + 4) % 8]} · ${dinnerItems[(index + 5) % 8]}`,
    Friday: `${breakfastItems[(index + 4) % 8]} · ${lunchItems[(index + 5) % 8]} · ${dinnerItems[(index + 6) % 8]}`
  };
};

export const hostels = areas.flatMap((area, areaIndex) =>
  Array.from({ length: 8 }, (_, hostelIndex) => {
    const index = areaIndex * 8 + hostelIndex;
    const isGirls = hostelIndex % 2 === 1;

    const price = 5000 + ((areaIndex * 700 + hostelIndex * 350) % 4500);
    const available = 3 + ((areaIndex + hostelIndex * 2) % 14);

    const singlePrice = price + 3000;
    const doublePrice = price;
    const triplePrice = Math.max(3500, price - 1000);

    const name = hostelNames[hostelIndex];

    return {
      id: `hyd-hostel-${String(index + 1).padStart(3, "0")}`,

      name: `${name} - ${area.name}`,

      gender: isGirls ? "Girls" : "Boys",

      location: `${area.name}, Hyderabad`,

      nearby: area.colleges[hostelIndex % area.colleges.length],

      price,

      available,

      rating: Number((4.0 + ((areaIndex + hostelIndex) % 10) / 10).toFixed(1)),

      reviews: 25 + ((areaIndex * 17 + hostelIndex * 13) % 150),

      image: imageUrls[index % imageUrls.length],

      amenities: amenitiesList[hostelIndex],

      description: `${
        isGirls
          ? girlsDescriptions[hostelIndex % girlsDescriptions.length]
          : boysDescriptions[hostelIndex % boysDescriptions.length]
      } Located in ${area.name}, Hyderabad, with convenient access to ${
        area.colleges.join(" and ")
      }.`,

      rooms: [
        {
          type: "Single",
          capacity: 1,
          price: singlePrice,
          available: Math.max(0, Math.floor(available / 5))
        },
        {
          type: "Double",
          capacity: 2,
          price: doublePrice,
          available: Math.max(0, Math.floor(available / 2))
        },
        {
          type: "Triple",
          capacity: 3,
          price: triplePrice,
          available: Math.max(0, available - Math.floor(available / 2))
        }
      ],

      menu: makeMenu(index),

      reviewList: [
        {
          ...studentReviews[index % studentReviews.length]
        },
        {
          ...studentReviews[(index + 2) % studentReviews.length]
        }
      ],

      searchKeywords: [
        area.name,
        area.nearby,
        ...area.colleges,
        "Hyderabad",
        "student hostel",
        "hostel accommodation",
        "student residence"
      ],

      isDemoData: true
    };
  })
);

export default hostels;