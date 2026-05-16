export interface Fundamental {
  title: string;
  summary: string;
  points: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface Course {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  color: string;
  duration: string;
  level: string;
  skills: string[];
  outcomes: string[];
  fundamentals: Fundamental[];
  quiz: QuizQuestion[];
}

export const COURSES: Course[] = [
  {
    id: "iot",
    title: "IoT & Embedded Systems",
    tagline: "Build smart devices that connect the physical and digital world",
    icon: "⚡",
    color: "#22D3EE",
    duration: "8 Weeks",
    level: "Beginner → Intermediate",
    skills: ["Arduino", "ESP32", "Sensors", "MQTT", "Python", "Cloud IoT"],
    outcomes: [
      "Build and deploy 3+ real IoT projects",
      "Understand embedded C programming",
      "Connect devices to cloud dashboards",
      "Ready for embedded roles at top firms",
    ],
    fundamentals: [
      {
        title: "What is IoT?",
        summary: "The Internet of Things connects everyday physical objects to the internet, enabling them to send and receive data.",
        points: [
          "Smart homes, wearables, industrial automation are all IoT",
          "IoT devices have sensors, processors, and communication modules",
          "Data flows: Device → Gateway → Cloud → Application",
          "Market is projected to exceed $1 trillion by 2030",
        ],
      },
      {
        title: "Microcontrollers (Arduino & ESP32)",
        summary: "Microcontrollers are small computers on a single chip — the brain of every embedded system.",
        points: [
          "Arduino Uno: beginner-friendly, 14 digital I/O pins, 6 analog inputs",
          "ESP32: WiFi + Bluetooth built-in, dual-core, ideal for IoT",
          "Programmed in C/C++ or MicroPython",
          "GPIO pins control LEDs, motors, sensors directly",
        ],
      },
      {
        title: "Sensors & Actuators",
        summary: "Sensors read the physical world; actuators create physical change based on digital commands.",
        points: [
          "DHT11/DHT22: temperature and humidity sensing",
          "PIR sensor: motion detection for security systems",
          "Ultrasonic (HC-SR04): distance measurement",
          "Actuators: servo motors, relays, DC motors, solenoids",
        ],
      },
      {
        title: "Communication Protocols",
        summary: "Protocols define how IoT devices talk to each other and to the cloud — choosing the right one is critical.",
        points: [
          "MQTT: lightweight publish/subscribe, perfect for IoT messaging",
          "HTTP/REST: familiar web protocol, used for cloud APIs",
          "Bluetooth (BLE): short-range, low-power device communication",
          "LoRa: long-range (10+ km), low-power for rural IoT",
        ],
      },
      {
        title: "IoT Architecture & Cloud",
        summary: "Modern IoT systems push data to the cloud for storage, processing, and visualization.",
        points: [
          "Edge computing: process data on the device, reduce latency",
          "AWS IoT Core, Azure IoT Hub: managed cloud platforms",
          "MQTT broker (HiveMQ, Mosquitto) for message routing",
          "Grafana dashboards for real-time data visualization",
        ],
      },
    ],
    quiz: [
      {
        question: "Which communication protocol is most commonly used for lightweight IoT messaging?",
        options: ["FTP", "MQTT", "SMTP", "HTTP"],
        correct: 1,
        explanation: "MQTT (Message Queuing Telemetry Transport) is designed for low-bandwidth, high-latency networks — perfect for IoT devices.",
      },
      {
        question: "What makes the ESP32 especially suitable for IoT projects?",
        options: [
          "It has the most GPIO pins",
          "It has built-in WiFi and Bluetooth",
          "It runs Android OS",
          "It has 4 GB of RAM",
        ],
        correct: 1,
        explanation: "The ESP32 integrates both WiFi and Bluetooth, making it ideal for IoT applications without needing external communication modules.",
      },
      {
        question: "Which sensor would you use to measure room temperature and humidity?",
        options: ["PIR sensor", "Ultrasonic HC-SR04", "DHT11/DHT22", "IR sensor"],
        correct: 2,
        explanation: "DHT11 and DHT22 are digital sensors that measure both temperature and humidity — commonly used in smart home and weather stations.",
      },
      {
        question: "What is 'edge computing' in the context of IoT?",
        options: [
          "Storing all data in a central cloud server",
          "Processing data near the device instead of the cloud",
          "Using edge connectors on PCBs",
          "Connecting IoT to social media platforms",
        ],
        correct: 1,
        explanation: "Edge computing processes data locally on or near the device, reducing latency and bandwidth usage — critical for real-time IoT applications.",
      },
      {
        question: "In an IoT data flow, what comes between the Device and the Cloud?",
        options: ["Database", "Gateway", "Actuator", "API"],
        correct: 1,
        explanation: "A gateway aggregates data from multiple IoT devices and forwards it to the cloud — it acts as the bridge between local devices and the internet.",
      },
    ],
  },
  {
    id: "ai-ml",
    title: "AI & Machine Learning",
    tagline: "Teach machines to think — build models that solve real problems",
    icon: "🧠",
    color: "#A78BFA",
    duration: "10 Weeks",
    level: "Beginner → Advanced",
    skills: ["Python", "NumPy", "Pandas", "Scikit-learn", "TensorFlow", "Deep Learning"],
    outcomes: [
      "Build and deploy ML models end-to-end",
      "Work with real datasets and solve business problems",
      "Create neural networks with TensorFlow/Keras",
      "Portfolio of 5+ projects for job interviews",
    ],
    fundamentals: [
      {
        title: "What is AI & Machine Learning?",
        summary: "Artificial Intelligence is the broad science of making machines smart. Machine Learning is a subset where machines learn from data — without being explicitly programmed.",
        points: [
          "AI: any technique enabling machines to mimic human intelligence",
          "ML: machines learn patterns from data to make predictions",
          "Deep Learning: ML using multi-layered neural networks",
          "Applications: recommendation engines, image recognition, fraud detection",
        ],
      },
      {
        title: "Types of Machine Learning",
        summary: "ML problems fall into three categories based on how the learning signal is provided.",
        points: [
          "Supervised Learning: labeled data, predict output (classification, regression)",
          "Unsupervised Learning: unlabeled data, find patterns (clustering, dimensionality reduction)",
          "Reinforcement Learning: agent learns by reward/punishment (game AI, robotics)",
          "Semi-supervised: mix of labeled and unlabeled data",
        ],
      },
      {
        title: "Neural Networks & Deep Learning",
        summary: "Neural networks are computing systems loosely inspired by the biological neural networks in brains.",
        points: [
          "Neurons arranged in layers: Input → Hidden → Output",
          "Weights and biases are adjusted during training (backpropagation)",
          "Activation functions: ReLU, Sigmoid, Tanh — introduce non-linearity",
          "CNNs for images, RNNs/LSTMs for sequences, Transformers for NLP",
        ],
      },
      {
        title: "Python for Machine Learning",
        summary: "Python is the language of choice for ML — its ecosystem is unmatched in data science.",
        points: [
          "NumPy: fast numerical computing with n-dimensional arrays",
          "Pandas: data manipulation and analysis with DataFrames",
          "Scikit-learn: classical ML algorithms, preprocessing, model selection",
          "TensorFlow/Keras & PyTorch: deep learning frameworks",
        ],
      },
      {
        title: "Model Evaluation & Overfitting",
        summary: "A model is only as good as how well it generalizes to new, unseen data.",
        points: [
          "Train/Validation/Test split: 70/15/15 is common",
          "Overfitting: model memorizes training data, fails on new data",
          "Metrics: Accuracy, Precision, Recall, F1-Score, AUC-ROC",
          "Regularization (L1/L2), Dropout, Cross-validation prevent overfitting",
        ],
      },
    ],
    quiz: [
      {
        question: "Machine Learning is a subset of which broader field?",
        options: ["Data Engineering", "Robotics", "Artificial Intelligence", "Statistics"],
        correct: 2,
        explanation: "Machine Learning is a subset of AI. AI is the broad concept; ML is one approach to achieving AI by learning from data.",
      },
      {
        question: "Which type of ML uses labeled training data to learn a mapping from inputs to outputs?",
        options: ["Unsupervised Learning", "Reinforcement Learning", "Supervised Learning", "Self-supervised Learning"],
        correct: 2,
        explanation: "Supervised Learning uses labeled examples (input-output pairs) to train the model — like showing it thousands of images labeled 'cat' or 'dog'.",
      },
      {
        question: "What does 'overfitting' mean in ML?",
        options: [
          "The model performs perfectly on test data",
          "The model memorizes training data but fails on new data",
          "The model has too few parameters",
          "The model trains too slowly",
        ],
        correct: 1,
        explanation: "Overfitting means the model learns the training data 'too well' — including its noise and outliers — and fails to generalize to new examples.",
      },
      {
        question: "Which Python library provides fast, n-dimensional array operations for ML?",
        options: ["Django", "Flask", "NumPy", "SQLAlchemy"],
        correct: 2,
        explanation: "NumPy (Numerical Python) provides efficient array operations and is the foundation of the entire Python scientific computing ecosystem.",
      },
      {
        question: "Which activation function is typically used in the output layer for binary classification?",
        options: ["ReLU", "Sigmoid", "Tanh", "Softmax"],
        correct: 1,
        explanation: "Sigmoid maps outputs to (0,1), making it ideal for binary classification where you need a probability. Softmax is used for multi-class problems.",
      },
    ],
  },
  {
    id: "vlsi",
    title: "VLSI Design",
    tagline: "Design the chips that power every device on the planet",
    icon: "🔬",
    color: "#34D399",
    duration: "12 Weeks",
    level: "Intermediate → Advanced",
    skills: ["Verilog HDL", "FPGA", "Digital Logic", "Synthesis", "Cadence/Xilinx", "Timing Analysis"],
    outcomes: [
      "Design digital circuits with Verilog/VHDL",
      "Implement designs on FPGA development boards",
      "Understand the full ASIC design flow",
      "Prepared for VLSI/semiconductor industry roles",
    ],
    fundamentals: [
      {
        title: "What is VLSI?",
        summary: "Very Large Scale Integration (VLSI) is the process of creating integrated circuits by combining thousands — or billions — of transistors on a single chip.",
        points: [
          "Modern CPUs have 10+ billion transistors on a chip smaller than a fingernail",
          "VLSI enables smartphones, laptops, satellites, and medical devices",
          "India's semiconductor industry is growing rapidly — demand for VLSI engineers is surging",
          "Career paths: physical design, verification, DFT, analog design",
        ],
      },
      {
        title: "Digital Logic Fundamentals",
        summary: "All digital circuits — from a simple adder to a complex CPU — are built from basic logic gates.",
        points: [
          "Boolean algebra: AND, OR, NOT, NAND, NOR, XOR operations",
          "Combinational circuits: output depends only on current inputs (adder, mux)",
          "Sequential circuits: output depends on inputs AND previous state (flip-flops, registers)",
          "Karnaugh Maps (K-Maps): simplify Boolean expressions for efficient circuits",
        ],
      },
      {
        title: "Verilog HDL",
        summary: "Hardware Description Language — you describe how hardware behaves, not write software instructions.",
        points: [
          "Two styles: Behavioral (what it does) and Structural (how it's built)",
          "Modules: the building block of Verilog — like functions in software",
          "Testbenches: simulate your design to verify correctness before taping out",
          "Synthesis converts Verilog to a gate-level netlist for physical implementation",
        ],
      },
      {
        title: "FPGA vs ASIC",
        summary: "Two ways to implement your digital design in hardware — each with distinct trade-offs.",
        points: [
          "FPGA: Field Programmable Gate Array — reprogrammable, ideal for prototyping and low-volume production",
          "ASIC: Application-Specific IC — fixed after fabrication, high volume, lower power, lower cost at scale",
          "FPGA tools: Xilinx Vivado, Intel Quartus — both free for students",
          "Development boards: Basys3, Nexys A7 (Xilinx), DE10-Nano (Intel)",
        ],
      },
      {
        title: "VLSI Design Flow",
        summary: "Taking a chip from idea to silicon requires a structured multi-stage process.",
        points: [
          "1. Specification → 2. RTL Design (Verilog) → 3. Functional Verification",
          "4. Synthesis (RTL → gates) → 5. Place & Route → 6. Static Timing Analysis",
          "7. DRC/LVS verification → 8. Tapeout (send to foundry)",
          "Industry tools: Cadence Virtuoso, Synopsys Design Compiler, Mentor Calibre",
        ],
      },
    ],
    quiz: [
      {
        question: "What does VLSI stand for?",
        options: [
          "Very Large Software Integration",
          "Very Large Scale Integration",
          "Variable Logic Signal Interface",
          "Virtual Layer Stack Implementation",
        ],
        correct: 1,
        explanation: "VLSI stands for Very Large Scale Integration — the process of creating integrated circuits with millions or billions of transistors.",
      },
      {
        question: "What is the purpose of a testbench in Verilog?",
        options: [
          "To physically test the chip after fabrication",
          "To simulate and verify the design before implementation",
          "To synthesize the design to gates",
          "To program an FPGA",
        ],
        correct: 1,
        explanation: "A testbench is a Verilog module that applies stimulus to your design and checks outputs — it verifies correctness in simulation before any hardware is produced.",
      },
      {
        question: "Which of the following is a key advantage of FPGA over ASIC?",
        options: [
          "Lower power consumption",
          "Better performance at scale",
          "Reprogrammable — can be reconfigured after deployment",
          "Cheaper for high-volume production",
        ],
        correct: 2,
        explanation: "FPGAs are reprogrammable — you can update the design by reprogramming. This makes them ideal for prototyping and applications requiring updates.",
      },
      {
        question: "In the VLSI design flow, what does 'synthesis' refer to?",
        options: [
          "Writing the RTL code",
          "Converting RTL code into a gate-level netlist",
          "Physically placing transistors on silicon",
          "Verifying the design with testbenches",
        ],
        correct: 1,
        explanation: "Synthesis converts RTL (Verilog/VHDL) to a gate-level netlist — a description of actual logic gates that can be mapped to the target technology.",
      },
      {
        question: "Which logic gate produces output 1 ONLY when ALL inputs are 1?",
        options: ["OR", "NAND", "AND", "XOR"],
        correct: 2,
        explanation: "The AND gate outputs 1 only when all inputs are 1. It is one of the three fundamental logic gates (AND, OR, NOT) from which all other logic can be built.",
      },
    ],
  },
  {
    id: "cloud-security",
    title: "Cloud & Cybersecurity",
    tagline: "Protect systems and build scalable cloud infrastructure",
    icon: "🛡️",
    color: "#FB923C",
    duration: "10 Weeks",
    level: "Beginner → Intermediate",
    skills: ["AWS", "Linux", "Networking", "Kali Linux", "Ethical Hacking", "DevSecOps"],
    outcomes: [
      "Deploy and manage cloud infrastructure on AWS",
      "Perform ethical penetration testing",
      "Understand network security and defense",
      "Earn preparation for AWS & CEH certifications",
    ],
    fundamentals: [
      {
        title: "Cloud Service Models",
        summary: "Cloud computing delivers IT resources over the internet on-demand — eliminating the need for physical data centers.",
        points: [
          "IaaS (Infrastructure as a Service): raw compute, storage, networking (AWS EC2, S3)",
          "PaaS (Platform as a Service): development environment managed for you (AWS Elastic Beanstalk)",
          "SaaS (Software as a Service): fully managed applications (Gmail, Salesforce, Zoom)",
          "On-demand pricing: pay only for what you use, scale instantly",
        ],
      },
      {
        title: "AWS Core Services",
        summary: "Amazon Web Services is the world's largest cloud provider — knowing AWS opens doors globally.",
        points: [
          "EC2 (Elastic Compute Cloud): virtual servers in the cloud",
          "S3 (Simple Storage Service): unlimited scalable object storage",
          "RDS: managed relational databases (MySQL, PostgreSQL, Aurora)",
          "IAM: Identity and Access Management — who can do what",
          "Lambda: serverless functions — run code without managing servers",
        ],
      },
      {
        title: "Cybersecurity Fundamentals",
        summary: "Security is about protecting information systems from threats, vulnerabilities, and attacks.",
        points: [
          "CIA Triad: Confidentiality, Integrity, Availability — the three pillars of security",
          "Threats vs Vulnerabilities: threats are potential attacks, vulnerabilities are weaknesses",
          "OWASP Top 10: most critical web application security risks",
          "Defence in Depth: layered security — no single point of failure",
        ],
      },
      {
        title: "Ethical Hacking Methodology",
        summary: "Ethical hackers (penetration testers) think like attackers to find and fix vulnerabilities before malicious hackers do.",
        points: [
          "1. Reconnaissance: gather information (OSINT, DNS, WHOIS)",
          "2. Scanning: identify open ports and services (Nmap, Nessus)",
          "3. Exploitation: attempt to gain access (Metasploit, Burp Suite)",
          "4. Post-Exploitation: assess impact, escalate privileges",
          "5. Reporting: document findings and remediation steps",
        ],
      },
      {
        title: "Network Security",
        summary: "Network security protects the integrity, confidentiality, and availability of data as it travels across networks.",
        points: [
          "Firewalls: filter traffic based on rules (stateful vs stateless)",
          "VPN (Virtual Private Network): encrypted tunnel for secure remote access",
          "TLS/SSL: encrypts data in transit — the 'S' in HTTPS",
          "IDS/IPS: Intrusion Detection/Prevention Systems — monitor and block attacks",
        ],
      },
    ],
    quiz: [
      {
        question: "Which cloud service model gives you the MOST control over the infrastructure?",
        options: ["SaaS", "PaaS", "IaaS", "FaaS"],
        correct: 2,
        explanation: "IaaS (Infrastructure as a Service) gives you raw compute, storage, and networking — you manage everything above the hypervisor, including the OS.",
      },
      {
        question: "Which AWS service is used for scalable object storage (like storing files and images)?",
        options: ["EC2", "RDS", "S3", "Lambda"],
        correct: 2,
        explanation: "S3 (Simple Storage Service) is AWS's object storage service — infinitely scalable, 99.999999999% durability, used for files, backups, and static websites.",
      },
      {
        question: "What does the CIA Triad stand for in cybersecurity?",
        options: [
          "Central Intelligence Access",
          "Confidentiality, Integrity, Availability",
          "Cloud Infrastructure Architecture",
          "Certified Information Assurance",
        ],
        correct: 1,
        explanation: "The CIA Triad defines the three core goals of information security: Confidentiality (only authorised access), Integrity (data isn't tampered), Availability (systems are accessible).",
      },
      {
        question: "Which Linux distribution is most widely used for ethical hacking and penetration testing?",
        options: ["Ubuntu", "CentOS", "Kali Linux", "Fedora"],
        correct: 2,
        explanation: "Kali Linux is a Debian-based distro pre-loaded with 600+ security tools — Nmap, Metasploit, Burp Suite, Wireshark — specifically designed for penetration testing.",
      },
      {
        question: "What is the primary purpose of a VPN?",
        options: [
          "Speed up internet connection",
          "Create an encrypted, private tunnel over a public network",
          "Block malicious websites",
          "Replace firewall functionality",
        ],
        correct: 1,
        explanation: "A VPN (Virtual Private Network) creates an encrypted tunnel over the public internet, ensuring data privacy and allowing secure remote access to private networks.",
      },
    ],
  },
];
