from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_pymongo import PyMongo
import firebase_admin
from firebase_admin import credentials, auth
import os
from datetime import datetime, timedelta
import random
from bson import ObjectId
import requests
import json
from functools import wraps

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# MongoDB Configuration
app.config["MONGO_URI"] = os.environ.get("MONGODB_URI", "mongodb+srv://your-username:your-password@cluster0.mongodb.net/dsa_tracker?retryWrites=true&w=majority")
mongo = PyMongo(app)

# Firebase Configuration
firebase_config = {
    "type": "service_account",
    "project_id": os.environ.get("FIREBASE_PROJECT_ID", "your-firebase-project-id"),
    "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
    "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_X509_CERT_URL")
}

# Initialize Firebase Admin SDK
try:
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Firebase initialization error: {e}")

# Motivational Quotes API
QUOTES_API = "https://api.quotable.io/random?tags=motivational,success,perseverance"

# COMPLETE DSA Learning Roadmap Data
DSA_ROADMAP = {
    "week_1": {
        "title": "Foundation & Environment",
        "goal": "Set up development environment and basic programming concepts",
        "days": {
            "monday": {
                "topic": "Environment Setup",
                "activities": "Install Python/C++, Git, IDE setup",
                "resources": [
                    {"name": "Python Setup - W3Schools", "url": "https://www.w3schools.com/python/python_getstarted.asp"},
                    {"name": "C++ Setup - JavaTpoint", "url": "https://www.javatpoint.com/cpp-tutorial"},
                    {"name": "Git Tutorial", "url": "https://git-scm.com/docs/gittutorial"},
                    {"name": "VS Code Setup", "url": "https://code.visualstudio.com/docs/setup/setup-overview"}
                ],
                "estimated_time": "2-3 hours",
                "difficulty": "Beginner"
            },
            "tuesday": {
                "topic": "Basic Syntax",
                "activities": "Variables, data types, operators",
                "resources": [
                    {"name": "Python Syntax - W3Schools", "url": "https://www.w3schools.com/python/python_syntax.asp"},
                    {"name": "C++ Basics - Programiz", "url": "https://www.programiz.com/cpp-programming"},
                    {"name": "Java Basics - Oracle", "url": "https://docs.oracle.com/javase/tutorial/java/nutsandbolts/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "wednesday": {
                "topic": "Input/Output",
                "activities": "File I/O, console I/O, formatting",
                "resources": [
                    {"name": "Python I/O - W3Schools", "url": "https://www.w3schools.com/python/python_user_input.asp"},
                    {"name": "C++ I/O - JavaTpoint", "url": "https://www.javatpoint.com/cpp-basic-input-output"},
                    {"name": "File Handling", "url": "https://www.programiz.com/python-programming/file-io"}
                ],
                "estimated_time": "2-3 hours",
                "difficulty": "Beginner"
            },
            "thursday": {
                "topic": "Functions",
                "activities": "Function definition, parameters, scope",
                "resources": [
                    {"name": "Python Functions - W3Schools", "url": "https://www.w3schools.com/python/python_functions.asp"},
                    {"name": "C++ Functions - TutorialsPoint", "url": "https://www.tutorialspoint.com/cplusplus/cpp_functions.htm"},
                    {"name": "Function Best Practices", "url": "https://realpython.com/defining-your-own-python-function/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "friday": {
                "topic": "Arrays/Lists Basics",
                "activities": "Creation, indexing, basic operations",
                "resources": [
                    {"name": "Python Lists - W3Schools", "url": "https://www.w3schools.com/python/python_lists.asp"},
                    {"name": "C++ Arrays - Programiz", "url": "https://www.programiz.com/cpp-programming/arrays"},
                    {"name": "Array Operations", "url": "https://www.geeksforgeeks.org/array-data-structure/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "saturday": {
                "topic": "Project Start: Scientific Calculator",
                "activities": "Plan features, basic arithmetic",
                "resources": [
                    {"name": "Calculator Project Guide", "url": "https://realpython.com/python-gui-tkinter/"},
                    {"name": "Math Operations in Python", "url": "https://docs.python.org/3/library/math.html"},
                    {"name": "GUI Development", "url": "https://tkdocs.com/tutorial/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "sunday": {
                "topic": "Project Complete: Scientific Calculator",
                "activities": "Advanced operations, error handling",
                "resources": [
                    {"name": "Error Handling in Python", "url": "https://docs.python.org/3/tutorial/errors.html"},
                    {"name": "GUI Development", "url": "https://tkdocs.com/tutorial/"},
                    {"name": "Testing Your Code", "url": "https://realpython.com/python-testing/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            }
        }
    },
    "week_2": {
        "title": "Arrays & String Mastery",
        "goal": "Master array operations and string manipulation",
        "days": {
            "monday": {
                "topic": "Array Operations",
                "activities": "Iteration, searching, basic algorithms",
                "resources": [
                    {"name": "Arrays - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_arrays.php"},
                    {"name": "Array Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Array.html"},
                    {"name": "VisuAlgo Arrays", "url": "https://visualgo.net/en/array"},
                    {"name": "GeeksforGeeks Arrays", "url": "https://www.geeksforgeeks.org/array-data-structure/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "tuesday": {
                "topic": "Two Pointers Technique",
                "activities": "Two Sum, reverse array, palindrome",
                "resources": [
                    {"name": "Two Pointers - LeetCode", "url": "https://leetcode.com/tag/two-pointers/"},
                    {"name": "NeetCode Two Pointers", "url": "https://www.youtube.com/watch?v=jzZsG8n2R9A"},
                    {"name": "GeeksforGeeks Two Pointers", "url": "https://www.geeksforgeeks.org/two-pointers-technique/"},
                    {"name": "CS Dojo Two Pointers", "url": "https://www.youtube.com/@CSDojo"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "String Processing",
                "activities": "Manipulation, pattern matching basics",
                "resources": [
                    {"name": "Strings - W3Schools", "url": "https://www.w3schools.com/python/python_strings.asp"},
                    {"name": "String DSA - JavaTpoint", "url": "https://www.javatpoint.com/string-in-data-structure"},
                    {"name": "mycodeschool Strings", "url": "https://www.youtube.com/playlist?list=PL2_aWCzGMAwLZp6LMUKI3cc7pgGsasm2_"},
                    {"name": "String Algorithms", "url": "https://www.geeksforgeeks.org/string-data-structure/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Sliding Window",
                "activities": "Maximum subarray, longest substring",
                "resources": [
                    {"name": "Sliding Window - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/window-sliding-technique/"},
                    {"name": "NeetCode Sliding Window", "url": "https://www.youtube.com/watch?v=jM2dhDPYMQM"},
                    {"name": "LeetCode Sliding Window", "url": "https://leetcode.com/tag/sliding-window/"},
                    {"name": "Back To Back SWE", "url": "https://www.youtube.com/c/BackToBackSWE"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Two Sum, Longest Substring, Valid Palindrome",
                "resources": [
                    {"name": "LeetCode Two Sum", "url": "https://leetcode.com/problems/two-sum/"},
                    {"name": "Longest Substring", "url": "https://leetcode.com/problems/longest-substring-without-repeating-characters/"},
                    {"name": "Valid Palindrome", "url": "https://leetcode.com/problems/valid-palindrome/"},
                    {"name": "Codeforces Practice", "url": "https://codeforces.com/problemset"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Intermediate"
            },
            "saturday": {
                "topic": "Project Start: Text Analyzer",
                "activities": "Word count, frequency analysis",
                "resources": [
                    {"name": "Text Processing in Python", "url": "https://realpython.com/working-with-files-in-python/"},
                    {"name": "NLTK Tutorial", "url": "https://www.nltk.org/book/"},
                    {"name": "Regular Expressions", "url": "https://docs.python.org/3/library/re.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "sunday": {
                "topic": "Project Complete: Text Analyzer",
                "activities": "Pattern detection, statistics",
                "resources": [
                    {"name": "Regular Expressions", "url": "https://docs.python.org/3/library/re.html"},
                    {"name": "Data Visualization", "url": "https://matplotlib.org/stable/tutorials/index.html"},
                    {"name": "Text Analytics", "url": "https://textblob.readthedocs.io/en/dev/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            }
        }
    },
    "week_3": {
        "title": "Linked Lists Deep Dive",
        "goal": "Master linked list operations and applications",
        "days": {
            "monday": {
                "topic": "Linked List Basics",
                "activities": "Node structure, traversal",
                "resources": [
                    {"name": "Linked Lists - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_linkedlists.php"},
                    {"name": "VisuAlgo Linked Lists", "url": "https://visualgo.net/en/list"},
                    {"name": "mycodeschool Linked Lists", "url": "https://www.youtube.com/watch?v=92S4zgXN17o"},
                    {"name": "CS Dojo LL Tutorial", "url": "https://www.youtube.com/@CSDojo"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "tuesday": {
                "topic": "Singly Linked Lists",
                "activities": "Insert, delete, search operations",
                "resources": [
                    {"name": "LL Operations - Programiz", "url": "https://www.programiz.com/dsa/linked-list"},
                    {"name": "GeeksforGeeks LL", "url": "https://www.geeksforgeeks.org/data-structures/linked-list/"},
                    {"name": "CS Dojo Linked Lists", "url": "https://www.youtube.com/watch?v=WwfhLC16bis"},
                    {"name": "JavaTpoint LL", "url": "https://www.javatpoint.com/singly-linked-list"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "Reverse & Manipulation",
                "activities": "Reverse list, merge, cycle detection",
                "resources": [
                    {"name": "Reverse LL - LeetCode", "url": "https://leetcode.com/problems/reverse-linked-list/"},
                    {"name": "Merge Two Lists", "url": "https://leetcode.com/problems/merge-two-sorted-lists/"},
                    {"name": "Cycle Detection", "url": "https://leetcode.com/problems/linked-list-cycle/"},
                    {"name": "Back To Back SWE LL", "url": "https://www.youtube.com/c/BackToBackSWE"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Doubly & Circular Lists",
                "activities": "Advanced variations and use cases",
                "resources": [
                    {"name": "Doubly LL - JavaTpoint", "url": "https://www.javatpoint.com/doubly-linked-list"},
                    {"name": "Circular LL - Programiz", "url": "https://www.programiz.com/dsa/circular-linked-list"},
                    {"name": "Advanced LL - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/doubly-linked-list/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Reverse, Merge Two Lists, Cycle Detection",
                "resources": [
                    {"name": "LeetCode LL Problems", "url": "https://leetcode.com/tag/linked-list/"},
                    {"name": "Codeforces LL", "url": "https://codeforces.com/problemset?tags=data+structures"},
                    {"name": "A2OJ Ladders", "url": "https://a2oj.com/ladders"},
                    {"name": "Pramp LL Practice", "url": "https://www.pramp.com/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Intermediate"
            },
            "saturday": {
                "topic": "Project Start: Music Playlist Manager",
                "activities": "Song management using linked lists",
                "resources": [
                    {"name": "Python Music Player", "url": "https://realpython.com/playing-and-recording-sound-python/"},
                    {"name": "Pygame Tutorial", "url": "https://realpython.com/pygame-a-primer/"},
                    {"name": "File Management", "url": "https://docs.python.org/3/library/os.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "sunday": {
                "topic": "Project Complete: Music Playlist Manager",
                "activities": "Shuffle, repeat, playlist operations",
                "resources": [
                    {"name": "File Management Python", "url": "https://docs.python.org/3/library/os.html"},
                    {"name": "Random Module", "url": "https://docs.python.org/3/library/random.html"},
                    {"name": "JSON Data Handling", "url": "https://docs.python.org/3/library/json.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            }
        }
    },
    "week_4": {
        "title": "Stacks & Queues Applications",
        "goal": "Understand LIFO/FIFO operations and real-world applications",
        "days": {
            "monday": {
                "topic": "Stack Fundamentals",
                "activities": "LIFO operations, implementation",
                "resources": [
                    {"name": "Stacks - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_stacks.php"},
                    {"name": "Stack Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/StackArray.html"},
                    {"name": "JavaTpoint Stack", "url": "https://www.javatpoint.com/data-structure-stack"},
                    {"name": "mycodeschool Stacks", "url": "https://www.youtube.com/watch?v=F1F2imiOJfk"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "tuesday": {
                "topic": "Stack Applications",
                "activities": "Expression evaluation, parentheses matching",
                "resources": [
                    {"name": "Stack Applications - Programiz", "url": "https://www.programiz.com/dsa/stack"},
                    {"name": "Expression Evaluation", "url": "https://www.geeksforgeeks.org/stack-set-2-infix-to-postfix/"},
                    {"name": "Balanced Parentheses", "url": "https://leetcode.com/problems/valid-parentheses/"},
                    {"name": "TutorialsPoint Stack", "url": "https://www.tutorialspoint.com/data_structures_algorithms/stack_algorithm.htm"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "Queue Fundamentals",
                "activities": "FIFO operations, circular queues",
                "resources": [
                    {"name": "Queues - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_queues.php"},
                    {"name": "Queue Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/QueueArray.html"},
                    {"name": "JavaTpoint Queue", "url": "https://www.javatpoint.com/data-structure-queue"},
                    {"name": "Circular Queue", "url": "https://www.programiz.com/dsa/circular-queue"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "thursday": {
                "topic": "Advanced Queues",
                "activities": "Deque, priority queue introduction",
                "resources": [
                    {"name": "Deque - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/deque-set-1-introduction-applications/"},
                    {"name": "Priority Queue - Programiz", "url": "https://www.programiz.com/dsa/priority-queue"},
                    {"name": "Python Deque", "url": "https://docs.python.org/3/library/collections.html#collections.deque"},
                    {"name": "VisuAlgo Queue", "url": "https://visualgo.net/en/list"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Valid Parentheses, Min Stack, Queue using Stacks",
                "resources": [
                    {"name": "Valid Parentheses - LeetCode", "url": "https://leetcode.com/problems/valid-parentheses/"},
                    {"name": "Min Stack", "url": "https://leetcode.com/problems/min-stack/"},
                    {"name": "Queue using Stacks", "url": "https://leetcode.com/problems/implement-queue-using-stacks/"},
                    {"name": "GeeksforGeeks Practice", "url": "https://www.geeksforgeeks.org/practice/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Intermediate"
            },
            "saturday": {
                "topic": "Project Start: Code Editor",
                "activities": "Undo/redo functionality using stacks",
                "resources": [
                    {"name": "Command Pattern", "url": "https://refactoring.guru/design-patterns/command"},
                    {"name": "Tkinter Text Editor", "url": "https://realpython.com/python-gui-tkinter/"},
                    {"name": "Undo/Redo Implementation", "url": "https://stackoverflow.com/questions/tagged/undo-redo"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "sunday": {
                "topic": "Project Complete: Code Editor",
                "activities": "Bracket matching, syntax validation",
                "resources": [
                    {"name": "Syntax Highlighting", "url": "https://pygments.org/"},
                    {"name": "Regular Expressions", "url": "https://docs.python.org/3/library/re.html"},
                    {"name": "File I/O Operations", "url": "https://realpython.com/working-with-files-in-python/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            }
        }
    },
    "week_5": {
        "title": "Binary Trees Foundation",
        "goal": "Master tree traversals and basic tree operations",
        "days": {
            "monday": {
                "topic": "Tree Basics",
                "activities": "Terminology, node structure",
                "resources": [
                    {"name": "Trees - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_trees.php"},
                    {"name": "Binary Trees - JavaTpoint", "url": "https://www.javatpoint.com/binary-tree"},
                    {"name": "Tree Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/BST.html"},
                    {"name": "mycodeschool Trees", "url": "https://www.youtube.com/watch?v=qH6yxkw0u78"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "tuesday": {
                "topic": "Tree Traversals (DFS)",
                "activities": "Preorder, inorder, postorder",
                "resources": [
                    {"name": "Tree Traversal - Programiz", "url": "https://www.programiz.com/dsa/tree-traversal"},
                    {"name": "GeeksforGeeks Traversals", "url": "https://www.geeksforgeeks.org/tree-traversals-inorder-preorder-and-postorder/"},
                    {"name": "VisuAlgo Binary Tree", "url": "https://visualgo.net/en/bst"},
                    {"name": "CS Dojo Tree Traversal", "url": "https://www.youtube.com/@CSDojo"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "Level Order (BFS)",
                "activities": "Breadth-first traversal using queues",
                "resources": [
                    {"name": "Level Order - TutorialsPoint", "url": "https://www.tutorialspoint.com/data_structures_algorithms/tree_traversal.htm"},
                    {"name": "BFS in Trees", "url": "https://www.geeksforgeeks.org/level-order-tree-traversal/"},
                    {"name": "W3Schools BFS", "url": "https://www.w3schools.com/dsa/dsa_algo_graphs_bfs.php"},
                    {"name": "LeetCode Level Order", "url": "https://leetcode.com/problems/binary-tree-level-order-traversal/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Tree Properties",
                "activities": "Height, depth, diameter calculations",
                "resources": [
                    {"name": "Tree Properties - JavaTpoint", "url": "https://www.javatpoint.com/tree-data-structure"},
                    {"name": "Tree Operations - Programiz", "url": "https://www.programiz.com/dsa/binary-tree"},
                    {"name": "Tree Height/Depth", "url": "https://www.geeksforgeeks.org/write-a-c-program-to-find-the-maximum-depth-or-height-of-a-tree/"},
                    {"name": "Tree Diameter", "url": "https://leetcode.com/problems/diameter-of-binary-tree/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Max Depth, Same Tree, Symmetric Tree",
                "resources": [
                    {"name": "Max Depth - LeetCode", "url": "https://leetcode.com/problems/maximum-depth-of-binary-tree/"},
                    {"name": "Same Tree", "url": "https://leetcode.com/problems/same-tree/"},
                    {"name": "Symmetric Tree", "url": "https://leetcode.com/problems/symmetric-tree/"},
                    {"name": "NeetCode Trees", "url": "https://www.youtube.com/@NeetCode"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Intermediate"
            },
            "saturday": {
                "topic": "Project Start: Family Tree",
                "activities": "Genealogy tree with traversals",
                "resources": [
                    {"name": "Tree Data Structure Design", "url": "https://realpython.com/python-data-structures/"},
                    {"name": "Graphviz for Tree Visualization", "url": "https://graphviz.org/"},
                    {"name": "JSON Tree Structure", "url": "https://docs.python.org/3/library/json.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "sunday": {
                "topic": "Project Complete: Family Tree",
                "activities": "Relationship queries, tree visualization",
                "resources": [
                    {"name": "Tree Queries", "url": "https://www.geeksforgeeks.org/lca-lowest-common-ancestor-in-a-binary-tree/"},
                    {"name": "Family Tree Algorithms", "url": "https://en.wikipedia.org/wiki/Genealogical_DNA_test"},
                    {"name": "Data Visualization", "url": "https://matplotlib.org/stable/tutorials/index.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            }
        }
    },
    "week_6": {
        "title": "Binary Search Trees",
        "goal": "Master BST operations and balanced tree concepts",
        "days": {
            "monday": {
                "topic": "BST Properties",
                "activities": "BST invariant, insertion, search",
                "resources": [
                    {"name": "BST Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/BST.html"},
                    {"name": "BST - Abdul Bari", "url": "https://www.youtube.com/watch?v=pYT9F8_LFTM"},
                    {"name": "BST - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/binary-search-tree-data-structure/"},
                    {"name": "VisuAlgo BST", "url": "https://visualgo.net/en/bst"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "tuesday": {
                "topic": "BST Operations",
                "activities": "Insert, delete, find operations",
                "resources": [
                    {"name": "BST Operations - Programiz", "url": "https://www.programiz.com/dsa/binary-search-tree"},
                    {"name": "BST Insert/Delete", "url": "https://www.geeksforgeeks.org/binary-search-tree-set-1-search-and-insertion/"},
                    {"name": "mycodeschool BST", "url": "https://www.youtube.com/watch?v=COZK7NATh4k"},
                    {"name": "JavaTpoint BST", "url": "https://www.javatpoint.com/binary-search-tree"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "BST Validation",
                "activities": "Validate BST, range checking",
                "resources": [
                    {"name": "Validate BST - LeetCode", "url": "https://leetcode.com/problems/validate-binary-search-tree/"},
                    {"name": "Validate BST - NeetCode", "url": "https://www.youtube.com/watch?v=s6ATEkipzow"},
                    {"name": "BST Validation Techniques", "url": "https://www.geeksforgeeks.org/a-program-to-check-if-a-binary-tree-is-bst-or-not/"},
                    {"name": "Range Validation", "url": "https://leetcode.com/problems/validate-binary-search-tree/discuss/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Balanced Trees",
                "activities": "AVL introduction, rotation concepts",
                "resources": [
                    {"name": "AVL Trees - VisuAlgo", "url": "https://visualgo.net/en/bst"},
                    {"name": "AVL Operations", "url": "https://www.geeksforgeeks.org/avl-tree-set-1-insertion/"},
                    {"name": "Tree Rotations", "url": "https://www.cs.usfca.edu/~galles/visualization/AVLtree.html"},
                    {"name": "Balanced BST", "url": "https://www.programiz.com/dsa/avl-tree"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Validate BST, Lowest Common Ancestor, Inorder Successor",
                "resources": [
                    {"name": "Validate BST", "url": "https://leetcode.com/problems/validate-binary-search-tree/"},
                    {"name": "LCA in BST", "url": "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/"},
                    {"name": "Inorder Successor", "url": "https://leetcode.com/problems/inorder-successor-in-bst/"},
                    {"name": "BST Problems", "url": "https://leetcode.com/tag/binary-search-tree/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Intermediate"
            },
            "saturday": {
                "topic": "Project Start: Student Database",
                "activities": "BST-based student record system",
                "resources": [
                    {"name": "Database Design", "url": "https://realpython.com/python-sqlite-sqlalchemy/"},
                    {"name": "BST for Databases", "url": "https://en.wikipedia.org/wiki/B-tree"},
                    {"name": "File System Organization", "url": "https://docs.python.org/3/library/csv.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "sunday": {
                "topic": "Project Complete: Student Database",
                "activities": "Search, grade analysis, reporting",
                "resources": [
                    {"name": "Data Analysis with Pandas", "url": "https://pandas.pydata.org/docs/getting_started/index.html"},
                    {"name": "Reporting with Python", "url": "https://realpython.com/python-data-analysis/"},
                    {"name": "CSV Data Processing", "url": "https://docs.python.org/3/library/csv.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            }
        }
    },
    "week_7": {
        "title": "Heaps & Priority Queues",
        "goal": "Master heap operations and priority-based algorithms",
        "days": {
            "monday": {
                "topic": "Heap Fundamentals",
                "activities": "Min/max heap properties, heapify",
                "resources": [
                    {"name": "Heap Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Heap.html"},
                    {"name": "Heap - Abdul Bari", "url": "https://www.youtube.com/watch?v=HqPJF2L5h9U"},
                    {"name": "Heaps - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/binary-heap/"},
                    {"name": "VisuAlgo Heap", "url": "https://visualgo.net/en/heap"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "tuesday": {
                "topic": "Heap Operations",
                "activities": "Insert, extract, build heap",
                "resources": [
                    {"name": "Heap Operations - Programiz", "url": "https://www.programiz.com/dsa/heap-data-structure"},
                    {"name": "Python heapq", "url": "https://docs.python.org/3/library/heapq.html"},
                    {"name": "Heap Implementation", "url": "https://www.geeksforgeeks.org/binary-heap/"},
                    {"name": "mycodeschool Heaps", "url": "https://www.youtube.com/watch?v=t0Cq6tVNRBA"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "Priority Queue",
                "activities": "Implementation using heaps",
                "resources": [
                    {"name": "Priority Queue - Programiz", "url": "https://www.programiz.com/dsa/priority-queue"},
                    {"name": "Python PriorityQueue", "url": "https://docs.python.org/3/library/queue.html#queue.PriorityQueue"},
                    {"name": "Priority Queue Applications", "url": "https://www.geeksforgeeks.org/priority-queue-set-1-introduction/"},
                    {"name": "Heap vs Priority Queue", "url": "https://stackoverflow.com/questions/18993269/difference-between-priority-queue-and-a-heap"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Heap Applications",
                "activities": "Top K elements, median finding, heap sort",
                "resources": [
                    {"name": "Top K Elements", "url": "https://leetcode.com/problems/kth-largest-element-in-an-array/"},
                    {"name": "Find Median", "url": "https://leetcode.com/problems/find-median-from-data-stream/"},
                    {"name": "Heap Sort", "url": "https://www.geeksforgeeks.org/heap-sort/"},
                    {"name": "Heap Sort Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/HeapSort.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Kth Largest, Merge K Lists, Top K Frequent",
                "resources": [
                    {"name": "Kth Largest Element", "url": "https://leetcode.com/problems/kth-largest-element-in-an-array/"},
                    {"name": "Merge K Sorted Lists", "url": "https://leetcode.com/problems/merge-k-sorted-lists/"},
                    {"name": "Top K Frequent Elements", "url": "https://leetcode.com/problems/top-k-frequent-elements/"},
                    {"name": "Heap Problems - LeetCode", "url": "https://leetcode.com/tag/heap/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Advanced"
            },
            "saturday": {
                "topic": "Project Start: Task Scheduler",
                "activities": "Priority-based task management",
                "resources": [
                    {"name": "Task Scheduling Algorithms", "url": "https://en.wikipedia.org/wiki/Scheduling_(computing)"},
                    {"name": "Priority Queue Implementation", "url": "https://realpython.com/python-heapq-module/"},
                    {"name": "Task Management System", "url": "https://docs.python.org/3/library/sched.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "sunday": {
                "topic": "Project Complete: Task Scheduler",
                "activities": "Deadline handling, priority queues",
                "resources": [
                    {"name": "Datetime Operations", "url": "https://docs.python.org/3/library/datetime.html"},
                    {"name": "Threading and Scheduling", "url": "https://docs.python.org/3/library/threading.html"},
                    {"name": "GUI for Task Manager", "url": "https://realpython.com/python-gui-tkinter/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            }
        }
    },
    "week_8": {
        "title": "Hashing & Hash Tables",
        "goal": "Master hash-based data structures and fast lookups",
        "days": {
            "monday": {
                "topic": "Hashing Basics",
                "activities": "Hash functions, collision handling",
                "resources": [
                    {"name": "Hash Table Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/OpenHash.html"},
                    {"name": "Hashing - CS Dojo", "url": "https://www.youtube.com/watch?v=shs0KM3wKv8"},
                    {"name": "Hash Tables - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/hashing-data-structure/"},
                    {"name": "VisuAlgo Hashing", "url": "https://visualgo.net/en/hashtable"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "tuesday": {
                "topic": "Hash Table Operations",
                "activities": "Insert, search, delete with collisions",
                "resources": [
                    {"name": "Hash Table Implementation", "url": "https://www.programiz.com/dsa/hash-table"},
                    {"name": "Collision Resolution", "url": "https://www.geeksforgeeks.org/hashing-set-2-separate-chaining/"},
                    {"name": "Open Addressing", "url": "https://www.geeksforgeeks.org/hashing-set-3-open-addressing/"},
                    {"name": "Python Dictionary", "url": "https://docs.python.org/3/tutorial/datastructures.html#dictionaries"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "Hash Applications",
                "activities": "Frequency counting, duplicate detection",
                "resources": [
                    {"name": "Hash Map Applications", "url": "https://www.geeksforgeeks.org/applications-of-hashing/"},
                    {"name": "Python Counter", "url": "https://docs.python.org/3/library/collections.html#collections.Counter"},
                    {"name": "Set Operations", "url": "https://docs.python.org/3/tutorial/datastructures.html#sets"},
                    {"name": "Hash-based Algorithms", "url": "https://leetcode.com/tag/hash-table/"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Advanced Hashing",
                "activities": "Rolling hash, perfect hashing, bloom filters",
                "resources": [
                    {"name": "Rolling Hash", "url": "https://www.geeksforgeeks.org/rolling-hash-to-find-lexicographically-smallest-substring/"},
                    {"name": "Rabin-Karp Algorithm", "url": "https://www.geeksforgeeks.org/rabin-karp-algorithm-for-pattern-searching/"},
                    {"name": "Bloom Filters", "url": "https://en.wikipedia.org/wiki/Bloom_filter"},
                    {"name": "Perfect Hashing", "url": "https://www.geeksforgeeks.org/perfect-hashing/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Two Sum, Group Anagrams, Valid Anagram, Subarray Sum",
                "resources": [
                    {"name": "Two Sum", "url": "https://leetcode.com/problems/two-sum/"},
                    {"name": "Group Anagrams", "url": "https://leetcode.com/problems/group-anagrams/"},
                    {"name": "Valid Anagram", "url": "https://leetcode.com/problems/valid-anagram/"},
                    {"name": "Subarray Sum Equals K", "url": "https://leetcode.com/problems/subarray-sum-equals-k/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Intermediate"
            },
            "saturday": {
                "topic": "Project Start: Spell Checker",
                "activities": "Hash-based dictionary and suggestions",
                "resources": [
                    {"name": "Spell Checker Algorithm", "url": "https://en.wikipedia.org/wiki/Spell_checker"},
                    {"name": "Edit Distance", "url": "https://en.wikipedia.org/wiki/Edit_distance"},
                    {"name": "Trie for Spell Check", "url": "https://www.geeksforgeeks.org/auto-complete-feature-using-trie/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "sunday": {
                "topic": "Project Complete: Spell Checker",
                "activities": "Edit distance, word suggestions, performance optimization",
                "resources": [
                    {"name": "Levenshtein Distance", "url": "https://en.wikipedia.org/wiki/Levenshtein_distance"},
                    {"name": "Fuzzy String Matching", "url": "https://pypi.org/project/fuzzywuzzy/"},
                    {"name": "Performance Optimization", "url": "https://docs.python.org/3/library/profile.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            }
        }
    },
    "week_9": {
        "title": "Graph Fundamentals",
        "goal": "Master graph representations and basic algorithms",
        "days": {
            "monday": {
                "topic": "Graph Basics",
                "activities": "Representation, adjacency list/matrix",
                "resources": [
                    {"name": "Graph Visualization", "url": "https://visualgo.net/en/graphds"},
                    {"name": "Graph Theory - CS Dojo", "url": "https://www.youtube.com/watch?v=gXgEDyodOJU"},
                    {"name": "Graphs - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/"},
                    {"name": "Graph Representations", "url": "https://www.programiz.com/dsa/graph"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "tuesday": {
                "topic": "DFS Implementation",
                "activities": "Depth-first search, applications",
                "resources": [
                    {"name": "DFS Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/DFS.html"},
                    {"name": "DFS Algorithm", "url": "https://www.geeksforgeeks.org/depth-first-search-or-dfs-for-a-graph/"},
                    {"name": "DFS Applications", "url": "https://www.programiz.com/dsa/graph-dfs"},
                    {"name": "mycodeschool DFS", "url": "https://www.youtube.com/watch?v=7fujbpJ0LB4"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "BFS Implementation",
                "activities": "Breadth-first search, shortest path",
                "resources": [
                    {"name": "BFS Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/BFS.html"},
                    {"name": "BFS Algorithm", "url": "https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/"},
                    {"name": "BFS Applications", "url": "https://www.programiz.com/dsa/graph-bfs"},
                    {"name": "Shortest Path with BFS", "url": "https://www.geeksforgeeks.org/shortest-path-unweighted-graph/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Graph Applications",
                "activities": "Connected components, cycle detection",
                "resources": [
                    {"name": "Connected Components", "url": "https://www.geeksforgeeks.org/connected-components-in-an-undirected-graph/"},
                    {"name": "Cycle Detection", "url": "https://www.geeksforgeeks.org/detect-cycle-in-a-graph/"},
                    {"name": "Graph Applications", "url": "https://www.geeksforgeeks.org/applications-of-graph-data-structure/"},
                    {"name": "Topological Sort Intro", "url": "https://www.geeksforgeeks.org/topological-sorting/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "friday": {
                "topic": "Key Problems",
                "activities": "Number of Islands, Clone Graph, Course Schedule",
                "resources": [
                    {"name": "Number of Islands", "url": "https://leetcode.com/problems/number-of-islands/"},
                    {"name": "Clone Graph", "url": "https://leetcode.com/problems/clone-graph/"},
                    {"name": "Course Schedule", "url": "https://leetcode.com/problems/course-schedule/"},
                    {"name": "Graph Problems - LeetCode", "url": "https://leetcode.com/tag/graph/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Intermediate"
            },
            "saturday": {
                "topic": "Project Start: Social Network",
                "activities": "Friend connections using graphs",
                "resources": [
                    {"name": "Social Network Analysis", "url": "https://en.wikipedia.org/wiki/Social_network_analysis"},
                    {"name": "NetworkX Python", "url": "https://networkx.org/"},
                    {"name": "Graph Databases", "url": "https://neo4j.com/developer/graph-database/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "sunday": {
                "topic": "Project Complete: Social Network",
                "activities": "Friend suggestions, mutual connections, communities",
                "resources": [
                    {"name": "Friend Recommendation", "url": "https://www.geeksforgeeks.org/suggest-friends-for-a-user-on-a-social-network/"},
                    {"name": "Community Detection", "url": "https://en.wikipedia.org/wiki/Community_structure"},
                    {"name": "Graph Visualization", "url": "https://matplotlib.org/stable/tutorials/index.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            }
        }
    },
    "week_10": {
        "title": "Advanced Graph Algorithms",
        "goal": "Master shortest path and advanced graph algorithms",
        "days": {
            "monday": {
                "topic": "Dijkstra's Algorithm",
                "activities": "Shortest path in weighted graphs",
                "resources": [
                    {"name": "Dijkstra Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Dijkstra.html"},
                    {"name": "Dijkstra - Abdul Bari", "url": "https://www.youtube.com/watch?v=XB4MIexjvY0"},
                    {"name": "Dijkstra's Algorithm", "url": "https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/"},
                    {"name": "VisuAlgo SSSP", "url": "https://visualgo.net/en/sssp"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "tuesday": {
                "topic": "Bellman-Ford Algorithm",
                "activities": "Negative weight handling, cycle detection",
                "resources": [
                    {"name": "Bellman-Ford", "url": "https://www.geeksforgeeks.org/bellman-ford-algorithm-dp-23/"},
                    {"name": "Negative Cycle Detection", "url": "https://www.programiz.com/dsa/bellman-ford-algorithm"},
                    {"name": "Bellman-Ford Visualization", "url": "https://visualgo.net/en/sssp"},
                    {"name": "Comparison with Dijkstra", "url": "https://stackoverflow.com/questions/13159337/why-doesnt-dijkstras-algorithm-work-for-negative-weight-edges"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "wednesday": {
                "topic": "Floyd-Warshall Algorithm",
                "activities": "All-pairs shortest path",
                "resources": [
                    {"name": "Floyd-Warshall", "url": "https://www.geeksforgeeks.org/floyd-warshall-algorithm-dp-16/"},
                    {"name": "All Pairs Shortest Path", "url": "https://www.programiz.com/dsa/floyd-warshall-algorithm"},
                    {"name": "Floyd-Warshall Visualization", "url": "https://visualgo.net/en/sssp"},
                    {"name": "Dynamic Programming Approach", "url": "https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "thursday": {
                "topic": "MST Algorithms",
                "activities": "Kruskal's and Prim's algorithms",
                "resources": [
                    {"name": "MST Visualization", "url": "https://visualgo.net/en/mst"},
                    {"name": "Kruskal's Algorithm", "url": "https://www.geeksforgeeks.org/kruskals-minimum-spanning-tree-algorithm-greedy-algo-2/"},
                    {"name": "Prim's Algorithm", "url": "https://www.geeksforgeeks.org/prims-minimum-spanning-tree-mst-greedy-algo-5/"},
                    {"name": "MST Applications", "url": "https://www.programiz.com/dsa/spanning-tree-and-minimum-spanning-tree"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "friday": {
                "topic": "Topological Sort & Advanced Problems",
                "activities": "Ordering in DAGs, advanced graph problems",
                "resources": [
                    {"name": "Topological Sort", "url": "https://www.geeksforgeeks.org/topological-sorting/"},
                    {"name": "Kahn's Algorithm", "url": "https://www.geeksforgeeks.org/topological-sorting-indegree-based-solution/"},
                    {"name": "Network Delay Time", "url": "https://leetcode.com/problems/network-delay-time/"},
                    {"name": "Course Schedule II", "url": "https://leetcode.com/problems/course-schedule-ii/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Advanced"
            },
            "saturday": {
                "topic": "Project Start: GPS Navigation",
                "activities": "Shortest path finder implementation",
                "resources": [
                    {"name": "GPS Algorithms", "url": "https://en.wikipedia.org/wiki/GPS_navigation_device"},
                    {"name": "OpenStreetMap API", "url": "https://wiki.openstreetmap.org/wiki/API"},
                    {"name": "Pathfinding Algorithms", "url": "https://en.wikipedia.org/wiki/Pathfinding"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Expert"
            },
            "sunday": {
                "topic": "Project Complete: GPS Navigation",
                "activities": "Route optimization, traffic handling, alternative routes",
                "resources": [
                    {"name": "A* Algorithm", "url": "https://en.wikipedia.org/wiki/A*_search_algorithm"},
                    {"name": "Traffic Optimization", "url": "https://en.wikipedia.org/wiki/Traffic_optimization"},
                    {"name": "Geospatial Analysis", "url": "https://geopandas.org/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Expert"
            }
        }
    },
    "week_11": {
        "title": "Sorting & Searching Mastery",
        "goal": "Master all major sorting algorithms and binary search variations",
        "days": {
            "monday": {
                "topic": "Basic Sorting Algorithms",
                "activities": "Bubble, selection, insertion sort",
                "resources": [
                    {"name": "Sorting Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/ComparisonSort.html"},
                    {"name": "Sorting Algorithms", "url": "https://www.geeksforgeeks.org/sorting-algorithms/"},
                    {"name": "VisuAlgo Sorting", "url": "https://visualgo.net/en/sorting"},
                    {"name": "Sorting Comparison", "url": "https://www.programiz.com/dsa/sorting-algorithm"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Beginner"
            },
            "tuesday": {
                "topic": "Merge Sort",
                "activities": "Divide and conquer approach",
                "resources": [
                    {"name": "Merge Sort - mycodeschool", "url": "https://www.youtube.com/watch?v=JSceec-wEyw"},
                    {"name": "Merge Sort Algorithm", "url": "https://www.geeksforgeeks.org/merge-sort/"},
                    {"name": "Merge Sort Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/ComparisonSort.html"},
                    {"name": "Divide and Conquer", "url": "https://www.programiz.com/dsa/divide-and-conquer"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "Quick Sort",
                "activities": "Partitioning and optimization",
                "resources": [
                    {"name": "Quick Sort Visualization", "url": "https://visualgo.net/en/sorting"},
                    {"name": "Quick Sort Algorithm", "url": "https://www.geeksforgeeks.org/quick-sort/"},
                    {"name": "Partitioning Schemes", "url": "https://www.geeksforgeeks.org/hoares-vs-lomuto-partition-scheme-quicksort/"},
                    {"name": "Quick Sort Optimization", "url": "https://en.wikipedia.org/wiki/Quicksort#Optimizations"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "thursday": {
                "topic": "Binary Search Mastery",
                "activities": "Search variations, bounds, rotated arrays",
                "resources": [
                    {"name": "Binary Search - NeetCode", "url": "https://www.youtube.com/watch?v=s4DPM8ct1pI"},
                    {"name": "Binary Search Template", "url": "https://leetcode.com/discuss/general-discussion/786126/python-powerful-ultimate-binary-search-template-solved-many-problems"},
                    {"name": "Search in Rotated Array", "url": "https://leetcode.com/problems/search-in-rotated-sorted-array/"},
                    {"name": "Binary Search Patterns", "url": "https://leetcode.com/discuss/general-discussion/691825/binary-search-for-beginners-problems-patterns-sample-solutions"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "friday": {
                "topic": "Advanced Searching & Sorting",
                "activities": "Counting sort, radix sort, ternary search",
                "resources": [
                    {"name": "Counting Sort", "url": "https://www.geeksforgeeks.org/counting-sort/"},
                    {"name": "Radix Sort", "url": "https://www.geeksforgeeks.org/radix-sort/"},
                    {"name": "Ternary Search", "url": "https://www.geeksforgeeks.org/ternary-search/"},
                    {"name": "Non-Comparison Sorts", "url": "https://en.wikipedia.org/wiki/Sorting_algorithm#Non-comparison_sorts"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Advanced"
            },
            "saturday": {
                "topic": "Project Start: Movie Database",
                "activities": "Sorting and searching optimization",
                "resources": [
                    {"name": "Database Indexing", "url": "https://en.wikipedia.org/wiki/Database_index"},
                    {"name": "Full-Text Search", "url": "https://en.wikipedia.org/wiki/Full-text_search"},
                    {"name": "Movie Database API", "url": "https://www.themoviedb.org/documentation/api"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "sunday": {
                "topic": "Project Complete: Movie Database",
                "activities": "Multi-criteria sorting, fast queries, recommendation engine",
                "resources": [
                    {"name": "Recommendation Systems", "url": "https://en.wikipedia.org/wiki/Recommender_system"},
                    {"name": "Multi-key Sorting", "url": "https://docs.python.org/3/howto/sorting.html#sort-stability-and-complex-sorts"},
                    {"name": "Search Optimization", "url": "https://elasticsearch-py.readthedocs.io/en/v8.8.0/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            }
        }
    },
    "week_12": {
        "title": "Recursion & Backtracking",
        "goal": "Master recursive problem-solving and backtracking patterns",
        "days": {
            "monday": {
                "topic": "Recursion Fundamentals",
                "activities": "Base cases, recursive thinking, call stack",
                "resources": [
                    {"name": "Recursion - CS Dojo", "url": "https://www.youtube.com/watch?v=KEEKn7Me-ms"},
                    {"name": "Recursion Visualization", "url": "http://pythontutor.com"},
                    {"name": "Recursion Basics", "url": "https://www.geeksforgeeks.org/recursion/"},
                    {"name": "mycodeschool Recursion", "url": "https://www.youtube.com/watch?v=k7-N8R0-KY4"}
                ],
                "estimated_time": "3-4 hours",
                "difficulty": "Intermediate"
            },
            "tuesday": {
                "topic": "Recursive Patterns",
                "activities": "Tree recursion, memoization, tail recursion",
                "resources": [
                    {"name": "Recursion Patterns", "url": "https://www.geeksforgeeks.org/recursion-practice-problems-solutions/"},
                    {"name": "Memoization", "url": "https://en.wikipedia.org/wiki/Memoization"},
                    {"name": "Tail Recursion", "url": "https://www.geeksforgeeks.org/tail-recursion/"},
                    {"name": "Python Recursion Limit", "url": "https://docs.python.org/3/library/sys.html#sys.setrecursionlimit"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Intermediate"
            },
            "wednesday": {
                "topic": "Backtracking Introduction",
                "activities": "Template, decision trees, pruning",
                "resources": [
                    {"name": "Backtracking - NeetCode", "url": "https://www.youtube.com/watch?v=pfiQ_PS1g8E"},
                    {"name": "Backtracking Algorithm", "url": "https://www.geeksforgeeks.org/backtracking-algorithms/"},
                    {"name": "Backtracking Template", "url": "https://leetcode.com/discuss/general-discussion/136503/what-is-backtracking-and-template-to-solve-backtracking-problems"},
                    {"name": "Decision Tree Pruning", "url": "https://en.wikipedia.org/wiki/Pruning_(decision_trees)"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "thursday": {
                "topic": "Classic Backtracking Problems",
                "activities": "N-Queens, Sudoku solver, maze solving",
                "resources": [
                    {"name": "N-Queens Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/RecQueens.html"},
                    {"name": "N-Queens Problem", "url": "https://leetcode.com/problems/n-queens/"},
                    {"name": "Sudoku Solver", "url": "https://leetcode.com/problems/sudoku-solver/"},
                    {"name": "Maze Solving", "url": "https://www.geeksforgeeks.org/rat-in-a-maze-backtracking-2/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Advanced"
            },
            "friday": {
                "topic": "Combinatorial Problems",
                "activities": "Subsets, permutations, combinations",
                "resources": [
                    {"name": "Subsets", "url": "https://leetcode.com/problems/subsets/"},
                    {"name": "Permutations", "url": "https://leetcode.com/problems/permutations/"},
                    {"name": "Combinations", "url": "https://leetcode.com/problems/combinations/"},
                    {"name": "Backtracking Problems", "url": "https://leetcode.com/tag/backtracking/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Advanced"
            },
            "saturday": {
                "topic": "Project Start: Sudoku Solver",
                "activities": "Interactive puzzle solver with GUI",
                "resources": [
                    {"name": "Sudoku Rules", "url": "https://en.wikipedia.org/wiki/Sudoku"},
                    {"name": "Constraint Satisfaction", "url": "https://en.wikipedia.org/wiki/Constraint_satisfaction_problem"},
                    {"name": "Tkinter Grid Layout", "url": "https://tkdocs.com/tutorial/grid.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Expert"
            },
            "sunday": {
                "topic": "Project Complete: Sudoku Solver",
                "activities": "Validation, hints, difficulty levels, step-by-step solving",
                "resources": [
                    {"name": "Sudoku Generation", "url": "https://www.geeksforgeeks.org/program-sudoku-generator/"},
                    {"name": "Difficulty Rating", "url": "https://en.wikipedia.org/wiki/Mathematics_of_Sudoku#Difficulty_rating"},
                    {"name": "Interactive GUI", "url": "https://realpython.com/python-gui-tkinter/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Expert"
            }
        }
    },
    "week_13": {
        "title": "Dynamic Programming",
        "goal": "Master DP patterns and optimization problems",
        "days": {
            "monday": {
                "topic": "DP Fundamentals",
                "activities": "Memoization vs tabulation, optimal substructure",
                "resources": [
                    {"name": "DP - NeetCode", "url": "https://www.youtube.com/watch?v=oBt53YbR9Kk"},
                    {"name": "Dynamic Programming", "url": "https://www.geeksforgeeks.org/dynamic-programming/"},
                    {"name": "DP Introduction", "url": "https://www.programiz.com/dsa/dynamic-programming"},
                    {"name": "Abdul Bari DP", "url": "https://www.youtube.com/watch?v=nqowUJzG-iM"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "tuesday": {
                "topic": "Classic DP Problems",
                "activities": "Fibonacci, climbing stairs, coin change",
                "resources": [
                    {"name": "DP Patterns", "url": "https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns"},
                    {"name": "Climbing Stairs", "url": "https://leetcode.com/problems/climbing-stairs/"},
                    {"name": "Coin Change", "url": "https://leetcode.com/problems/coin-change/"},
                    {"name": "House Robber", "url": "https://leetcode.com/problems/house-robber/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "wednesday": {
                "topic": "String DP",
                "activities": "LCS, edit distance, palindromes",
                "resources": [
                    {"name": "Longest Common Subsequence", "url": "https://www.geeksforgeeks.org/longest-common-subsequence-dp-4/"},
                    {"name": "Edit Distance", "url": "https://leetcode.com/problems/edit-distance/"},
                    {"name": "Palindromic Subsequence", "url": "https://leetcode.com/problems/longest-palindromic-subsequence/"},
                    {"name": "String DP Problems", "url": "https://leetcode.com/tag/string/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Advanced"
            },
            "thursday": {
                "topic": "Knapsack Problems",
                "activities": "0/1 knapsack, unbounded knapsack, variations",
                "resources": [
                    {"name": "0/1 Knapsack", "url": "https://www.geeksforgeeks.org/0-1-knapsack-problem-dp-10/"},
                    {"name": "Knapsack DP", "url": "https://www.youtube.com/watch?v=8LusJS5-AGo"},
                    {"name": "Unbounded Knapsack", "url": "https://www.geeksforgeeks.org/unbounded-knapsack-repetition-items-allowed/"},
                    {"name": "Partition Equal Subset", "url": "https://leetcode.com/problems/partition-equal-subset-sum/"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Advanced"
            },
            "friday": {
                "topic": "Advanced DP",
                "activities": "LIS, maximum subarray, matrix chain multiplication",
                "resources": [
                    {"name": "Longest Increasing Subsequence", "url": "https://leetcode.com/problems/longest-increasing-subsequence/"},
                    {"name": "Maximum Subarray", "url": "https://leetcode.com/problems/maximum-subarray/"},
                    {"name": "Matrix Chain Multiplication", "url": "https://www.geeksforgeeks.org/matrix-chain-multiplication-dp-8/"},
                    {"name": "DP on Trees", "url": "https://www.geeksforgeeks.org/dynamic-programming-trees-set-1/"}
                ],
                "estimated_time": "6-7 hours",
                "difficulty": "Expert"
            },
            "saturday": {
                "topic": "Project Start: Investment Calculator",
                "activities": "DP-based financial optimization",
                "resources": [
                    {"name": "Portfolio Optimization", "url": "https://en.wikipedia.org/wiki/Portfolio_optimization"},
                    {"name": "Dynamic Investment", "url": "https://www.investopedia.com/terms/d/dynamicassetallocation.asp"},
                    {"name": "Financial Modeling", "url": "https://en.wikipedia.org/wiki/Financial_modeling"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Expert"
            },
            "sunday": {
                "topic": "Project Complete: Investment Calculator",
                "activities": "Portfolio optimization, risk analysis, scenario planning",
                "resources": [
                    {"name": "Risk Management", "url": "https://en.wikipedia.org/wiki/Financial_risk_management"},
                    {"name": "Monte Carlo Simulation", "url": "https://en.wikipedia.org/wiki/Monte_Carlo_method"},
                    {"name": "Data Visualization", "url": "https://plotly.com/python/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Expert"
            }
        }
    },
    "week_14": {
        "title": "Advanced Topics & System Design",
        "goal": "Integrate all concepts into comprehensive systems",
        "days": {
            "monday": {
                "topic": "Greedy Algorithms",
                "activities": "Activity selection, Huffman coding, fractional knapsack",
                "resources": [
                    {"name": "Greedy Algorithms", "url": "https://www.geeksforgeeks.org/greedy-algorithms/"},
                    {"name": "Activity Selection", "url": "https://www.geeksforgeeks.org/activity-selection-problem-greedy-algo-1/"},
                    {"name": "Huffman Coding", "url": "https://www.geeksforgeeks.org/huffman-coding-greedy-algo-3/"},
                    {"name": "Greedy vs DP", "url": "https://stackoverflow.com/questions/16690249/what-is-the-difference-between-dynamic-programming-and-greedy-approach"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "tuesday": {
                "topic": "Bit Manipulation",
                "activities": "Bitwise operations, bit tricks, XOR properties",
                "resources": [
                    {"name": "Bit Manipulation", "url": "https://www.youtube.com/watch?v=NLKQEOgBAnw"},
                    {"name": "Bit Tricks", "url": "https://www.geeksforgeeks.org/bit-tricks-competitive-programming/"},
                    {"name": "XOR Properties", "url": "https://www.geeksforgeeks.org/xor-of-two-numbers/"},
                    {"name": "Bit Manipulation Problems", "url": "https://leetcode.com/tag/bit-manipulation/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "wednesday": {
                "topic": "Trie Data Structure",
                "activities": "Prefix trees, autocomplete, word search",
                "resources": [
                    {"name": "Trie Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Trie.html"},
                    {"name": "Trie Data Structure", "url": "https://www.geeksforgeeks.org/trie-insert-and-search/"},
                    {"name": "Autocomplete with Trie", "url": "https://www.geeksforgeeks.org/auto-complete-feature-using-trie/"},
                    {"name": "Word Search II", "url": "https://leetcode.com/problems/word-search-ii/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "thursday": {
                "topic": "Union-Find (Disjoint Set)",
                "activities": "Path compression, union by rank, applications",
                "resources": [
                    {"name": "Union-Find Visualization", "url": "https://visualgo.net/en/ufds"},
                    {"name": "Disjoint Set Union", "url": "https://www.geeksforgeeks.org/disjoint-set-data-structures/"},
                    {"name": "Union-Find Applications", "url": "https://en.wikipedia.org/wiki/Disjoint-set_data_structure"},
                    {"name": "Number of Islands II", "url": "https://leetcode.com/problems/number-of-islands-ii/"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Advanced"
            },
            "friday": {
                "topic": "System Design Fundamentals",
                "activities": "Scalability, data structure choices, trade-offs",
                "resources": [
                    {"name": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer"},
                    {"name": "Scalability", "url": "https://en.wikipedia.org/wiki/Scalability"},
                    {"name": "Database Design", "url": "https://en.wikipedia.org/wiki/Database_design"},
                    {"name": "CAP Theorem", "url": "https://en.wikipedia.org/wiki/CAP_theorem"}
                ],
                "estimated_time": "5-6 hours",
                "difficulty": "Expert"
            },
            "saturday": {
                "topic": "Project Start: File Compressor",
                "activities": "Huffman coding implementation",
                "resources": [
                    {"name": "File Compression", "url": "https://en.wikipedia.org/wiki/Data_compression"},
                    {"name": "Huffman Coding Implementation", "url": "https://www.geeksforgeeks.org/huffman-coding-greedy-algo-3/"},
                    {"name": "Binary File I/O", "url": "https://docs.python.org/3/library/io.html"}
                ],
                "estimated_time": "4-5 hours",
                "difficulty": "Expert"
            },
            "sunday": {
                "topic": "Final Project: Mini Database System",
                "activities": "Complete system integrating all DSA concepts",
                "resources": [
                    {"name": "Database Implementation", "url": "https://en.wikipedia.org/wiki/Database_engine"},
                    {"name": "B-Tree Implementation", "url": "https://www.geeksforgeeks.org/b-tree-set-1-introduction-2/"},
                    {"name": "Query Processing", "url": "https://en.wikipedia.org/wiki/Query_optimization"},
                    {"name": "ACID Properties", "url": "https://en.wikipedia.org/wiki/ACID"}
                ],
                "estimated_time": "6-8 hours",
                "difficulty": "Expert"
            }
        }
    }
}

# Practice platforms with direct links
PRACTICE_PLATFORMS = {
    "primary": [
        {"name": "LeetCode", "url": "https://leetcode.com", "description": "Primary coding interview preparation"},
        {"name": "HackerRank", "url": "https://www.hackerrank.com", "description": "Structured learning with tutorials"},
        {"name": "GeeksforGeeks Practice", "url": "https://practice.geeksforgeeks.org", "description": "Comprehensive problem sets"}
    ],
    "competitive": [
        {"name": "Codeforces", "url": "https://codeforces.com", "description": "Competitive programming contests"},
        {"name": "CodeChef", "url": "https://www.codechef.com", "description": "Monthly programming contests"},
        {"name": "AtCoder", "url": "https://atcoder.jp", "description": "Japanese competitive programming"}
    ],
    "interview_prep": [
        {"name": "Pramp", "url": "https://www.pramp.com", "description": "Mock technical interviews"},
        {"name": "InterviewBit", "url": "https://www.interviewbit.com", "description": "Structured interview preparation"},
        {"name": "A2OJ Ladders", "url": "https://a2oj.com/ladders", "description": "Progressive problem difficulty"}
    ],
    "visualization": [
        {"name": "VisuAlgo", "url": "https://visualgo.net", "description": "Algorithm and data structure visualizations"},
        {"name": "USFCA Visualizations", "url": "https://www.cs.usfca.edu/~galles/visualization/Algorithms.html", "description": "Interactive algorithm animations"},
        {"name": "Python Tutor", "url": "http://pythontutor.com", "description": "Code execution visualization"}
    ]
}

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            decoded_token = auth.verify_id_token(token)
            current_user = decoded_token['uid']
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# Helper function to serialize ObjectId
def serialize_doc(doc):
    if doc:
        doc['_id'] = str(doc['_id'])
    return doc

@app.route('/')
def index():
    return jsonify({
        "message": "DSA Learning Roadmap Tracker API",
        "version": "1.0.0",
        "features": [
            "Complete 14-week DSA roadmap",
            "Progress tracking with achievements",
            "Calendar integration",
            "Notes and review system",
            "Motivational quotes",
            "Analytics dashboard",
            "Search functionality",
            "Data export capabilities"
        ],
        "endpoints": {
            "auth": "/auth/*",
            "progress": "/api/progress/*",
            "calendar": "/api/calendar/*",
            "notes": "/api/notes/*",
            "quotes": "/api/quotes/*",
            "roadmap": "/api/roadmap/*",
            "achievements": "/api/achievements/*",
            "practice": "/api/practice/*"
        }
    })

# Authentication Routes
@app.route('/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        display_name = data.get('displayName', '')
        
        # Create user in Firebase
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )
        
        # Create user profile in MongoDB
        user_profile = {
            "uid": user.uid,
            "email": email,
            "display_name": display_name,
            "created_at": datetime.utcnow(),
            "total_streak": 0,
            "current_streak": 0,
            "last_activity": None,
            "level": 1,
            "experience": 0,
            "achievements": [],
            "preferences": {
                "difficulty": "beginner",
                "daily_goal_hours": 2,
                "notifications": True,
                "theme": "light"
            }
        }
        
        mongo.db.users.insert_one(user_profile)
        
        return jsonify({
            "message": "User created successfully",
            "uid": user.uid
        }), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        token = data.get('token')
        
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        # Get or create user profile
        user_profile = mongo.db.users.find_one({"uid": uid})
        if not user_profile:
            user_profile = {
                "uid": uid,
                "email": decoded_token.get('email'),
                "display_name": decoded_token.get('name', ''),
                "created_at": datetime.utcnow(),
                "total_streak": 0,
                "current_streak": 0,
                "last_activity": None,
                "level": 1,
                "experience": 0,
                "achievements": [],
                "preferences": {
                    "difficulty": "beginner",
                    "daily_goal_hours": 2,
                    "notifications": True,
                    "theme": "light"
                }
            }
            mongo.db.users.insert_one(user_profile)
        
        return jsonify({
            "message": "Login successful",
            "user": serialize_doc(user_profile)
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Progress Routes
@app.route('/api/progress', methods=['GET'])
@token_required
def get_progress(current_user):
    try:
        week = request.args.get('week')
        query = {"uid": current_user}
        
        if week:
            query["week"] = week
        
        progress = list(mongo.db.progress.find(query).sort("updated_at", -1))
        return jsonify([serialize_doc(p) for p in progress]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/progress', methods=['POST'])
@token_required
def update_progress(current_user):
    try:
        data = request.get_json()
        week = data.get('week')
        day = data.get('day')
        topic = data.get('topic')
        completed = data.get('completed', False)
        time_spent = data.get('time_spent', 0)
        difficulty_rating = data.get('difficulty_rating', 1)
        notes = data.get('notes', '')
        
        # Check if progress exists
        existing_progress = mongo.db.progress.find_one({
            "uid": current_user,
            "week": week,
            "day": day
        })
        
        progress_data = {
            "uid": current_user,
            "week": week,
            "day": day,
            "topic": topic,
            "completed": completed,
            "time_spent": time_spent,
            "difficulty_rating": difficulty_rating,
            "notes": notes,
            "updated_at": datetime.utcnow()
        }
        
        if existing_progress:
            mongo.db.progress.update_one(
                {"_id": existing_progress["_id"]},
                {"$set": progress_data}
            )
        else:
            progress_data["created_at"] = datetime.utcnow()
            mongo.db.progress.insert_one(progress_data)
        
        # Update user streak and experience
        if completed:
            update_user_streak_and_experience(current_user, time_spent)
        
        return jsonify({"message": "Progress updated successfully"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def update_user_streak_and_experience(uid, time_spent):
    user = mongo.db.users.find_one({"uid": uid})
    if not user:
        return
    
    today = datetime.utcnow().date()
    last_activity = user.get('last_activity')
    
    if last_activity:
        last_activity_date = last_activity.date() if isinstance(last_activity, datetime) else datetime.strptime(last_activity, '%Y-%m-%d').date()
        
        if last_activity_date == today:
            # Already updated today
            return
        elif last_activity_date == today - timedelta(days=1):
            # Consecutive day
            current_streak = user.get('current_streak', 0) + 1
        else:
            # Streak broken
            current_streak = 1
    else:
        current_streak = 1
    
    # Calculate experience based on time spent (10 exp per hour)
    experience_gained = time_spent * 10
    total_experience = user.get('experience', 0) + experience_gained
    
    # Calculate level (every 1000 exp = 1 level)
    level = (total_experience // 1000) + 1
    
    # Update user
    mongo.db.users.update_one(
        {"uid": uid},
        {
            "$set": {
                "current_streak": current_streak,
                "total_streak": max(user.get('total_streak', 0), current_streak),
                "last_activity": datetime.utcnow(),
                "experience": total_experience,
                "level": level
            }
        }
    )
    
    # Check for achievements
    check_achievements(uid, current_streak, level, total_experience)

def check_achievements(uid, streak, level, experience):
    user = mongo.db.users.find_one({"uid": uid})
    current_achievements = user.get('achievements', [])
    
    new_achievements = []
    
    # Streak achievements
    streak_milestones = [7, 30, 100, 365]
    for milestone in streak_milestones:
        achievement_id = f"streak_{milestone}"
        if streak >= milestone and achievement_id not in current_achievements:
            new_achievements.append({
                "id": achievement_id,
                "title": f"{milestone} Day Streak!",
                "description": f"Completed {milestone} consecutive days of learning",
                "earned_at": datetime.utcnow(),
                "type": "streak",
                "icon": "🔥",
                "points": milestone * 10
            })
    
    # Level achievements
    level_milestones = [5, 10, 25, 50, 100]
    for milestone in level_milestones:
        achievement_id = f"level_{milestone}"
        if level >= milestone and achievement_id not in current_achievements:
            new_achievements.append({
                "id": achievement_id,
                "title": f"Level {milestone} Master!",
                "description": f"Reached level {milestone}",
                "earned_at": datetime.utcnow(),
                "type": "level",
                "icon": "⭐",
                "points": milestone * 100
            })
    
    # Weekly completion achievements
    completed_weeks = mongo.db.progress.distinct("week", {"uid": uid, "completed": True})
    week_milestones = [1, 5, 10, 14]
    for milestone in week_milestones:
        achievement_id = f"weeks_{milestone}"
        if len(completed_weeks) >= milestone and achievement_id not in current_achievements:
            new_achievements.append({
                "id": achievement_id,
                "title": f"Completed {milestone} Week{'s' if milestone > 1 else ''}!",
                "description": f"Successfully completed {milestone} week{'s' if milestone > 1 else ''} of the roadmap",
                "earned_at": datetime.utcnow(),
                "type": "completion",
                "icon": "🏆",
                "points": milestone * 500
            })
    
    if new_achievements:
        achievement_ids = [a["id"] for a in new_achievements]
        mongo.db.users.update_one(
            {"uid": uid},
            {"$addToSet": {"achievements": {"$each": achievement_ids}}}
        )
        
        # Store detailed achievements
        for achievement in new_achievements:
            achievement["uid"] = uid
            mongo.db.achievements.insert_one(achievement)

# Calendar Routes
@app.route('/api/calendar', methods=['GET'])
@token_required
def get_calendar_events(current_user):
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        query = {"uid": current_user}
        if start_date and end_date:
            query["date"] = {
                "$gte": datetime.strptime(start_date, '%Y-%m-%d'),
                "$lte": datetime.strptime(end_date, '%Y-%m-%d')
            }
        
        events = list(mongo.db.calendar_events.find(query).sort("date", 1))
        
        # Add automatic events from roadmap
        if not start_date or not end_date:
            auto_events = generate_roadmap_events(current_user)
            events.extend(auto_events)
        
        return jsonify([serialize_doc(event) for event in events]), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_roadmap_events(uid):
    """Generate calendar events from roadmap data"""
    events = []
    start_date = datetime.utcnow().date()
    
    for week_num, week_data in DSA_ROADMAP.items():
        week_index = int(week_num.split('_')[1]) - 1
        
        for day_name, day_data in week_data["days"].items():
            # Calculate the date for this day
            day_offset = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].index(day_name)
            event_date = start_date + timedelta(weeks=week_index, days=day_offset)
            
            event = {
                "uid": uid,
                "title": f"{day_data['topic']}",
                "description": day_data["activities"],
                "date": datetime.combine(event_date, datetime.min.time()),
                "type": "roadmap",
                "week": week_num,
                "day": day_name,
                "estimated_time": day_data.get("estimated_time", "3-4 hours"),
                "difficulty": day_data.get("difficulty", "Intermediate"),
                "auto_generated": True
            }
            events.append(event)
    
    return events[:50]  # Limit to prevent too many events

@app.route('/api/calendar', methods=['POST'])
@token_required
def create_calendar_event(current_user):
    try:
        data = request.get_json()
        
        event = {
            "uid": current_user,
            "title": data.get('title'),
            "description": data.get('description', ''),
            "date": datetime.strptime(data.get('date'), '%Y-%m-%d'),
            "time": data.get('time'),
            "type": data.get('type', 'study'),  # study, review, project, break
            "week": data.get('week'),
            "day": data.get('day'),
            "completed": False,
            "reminder": data.get('reminder', False),
            "created_at": datetime.utcnow()
        }
        
        result = mongo.db.calendar_events.insert_one(event)
        event['_id'] = str(result.inserted_id)
        
        return jsonify(event), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Notes Routes
@app.route('/api/notes', methods=['GET'])
@token_required
def get_notes(current_user):
    try:
        week = request.args.get('week')
        day = request.args.get('day')
        search = request.args.get('search')
        
        query = {"uid": current_user}
        if week:
            query["week"] = week
        if day:
            query["day"] = day
        if search:
            query["$or"] = [
                {"content": {"$regex": search, "$options": "i"}},
                {"topic": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
        
        notes = list(mongo.db.notes.find(query).sort("created_at", -1))
        return jsonify([serialize_doc(note) for note in notes]), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes', methods=['POST'])
@token_required
def create_note(current_user):
    try:
        data = request.get_json()
        
        note = {
            "uid": current_user,
            "week": data.get('week'),
            "day": data.get('day'),
            "topic": data.get('topic'),
            "content": data.get('content'),
            "tags": data.get('tags', []),
            "review_needed": data.get('review_needed', False),
            "priority": data.get('priority', 'medium'),  # low, medium, high
            "category": data.get('category', 'general'),  # concept, problem, insight, question
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = mongo.db.notes.insert_one(note)
        note['_id'] = str(result.inserted_id)
        
        return jsonify(note), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes/<note_id>', methods=['PUT'])
@token_required
def update_note(current_user, note_id):
    try:
        data = request.get_json()
        
        update_data = {
            "content": data.get('content'),
            "tags": data.get('tags', []),
            "review_needed": data.get('review_needed', False),
            "priority": data.get('priority', 'medium'),
            "category": data.get('category', 'general'),
            "updated_at": datetime.utcnow()
        }
        
        result = mongo.db.notes.update_one(
            {"_id": ObjectId(note_id), "uid": current_user},
            {"$set": update_data}
        )
        
        if result.matched_count:
            return jsonify({"message": "Note updated successfully"}), 200
        else:
            return jsonify({"error": "Note not found"}), 404
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes/<note_id>', methods=['DELETE'])
@token_required
def delete_note(current_user, note_id):
    try:
        result = mongo.db.notes.delete_one({
            "_id": ObjectId(note_id),
            "uid": current_user
        })
        
        if result.deleted_count:
            return jsonify({"message": "Note deleted successfully"}), 200
        else:
            return jsonify({"error": "Note not found"}), 404
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Quotes Route
@app.route('/api/quotes/daily', methods=['GET'])
def get_daily_quote():
    try:
        # Try to get from external API
        response = requests.get(QUOTES_API, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                "quote": data.get('content', ''),
                "author": data.get('author', ''),
                "source": "quotable.io"
            }), 200
        else:
            # Fallback quotes specifically for programmers/learners
            fallback_quotes = [
                {"quote": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
                {"quote": "Code is like humor. When you have to explain it, it's bad.", "author": "Cory House"},
                {"quote": "First, solve the problem. Then, write the code.", "author": "John Johnson"},
                {"quote": "Experience is the name everyone gives to their mistakes.", "author": "Oscar Wilde"},
                {"quote": "In order to be irreplaceable, one must always be different.", "author": "Coco Chanel"},
                {"quote": "Java is to JavaScript what car is to Carpet.", "author": "Chris Heilmann"},
                {"quote": "Knowledge is power.", "author": "Francis Bacon"},
                {"quote": "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.", "author": "Dan Salomon"},
                {"quote": "Programming isn't about what you know; it's about what you can figure out.", "author": "Chris Pine"},
                {"quote": "The best error message is the one that never shows up.", "author": "Thomas Fuchs"},
                {"quote": "Simplicity is the ultimate sophistication.", "author": "Leonardo da Vinci"},
                {"quote": "Before software can be reusable it first has to be usable.", "author": "Ralph Johnson"},
                {"quote": "Make it work, make it right, make it fast.", "author": "Kent Beck"},
                {"quote": "The most disastrous thing that you can ever learn is your first programming language.", "author": "Alan Kay"},
                {"quote": "Walking on water and developing software from a specification are easy if both are frozen.", "author": "Edward V Berard"}
            ]
            
            quote = random.choice(fallback_quotes)
            return jsonify({
                "quote": quote["quote"],
                "author": quote["author"],
                "source": "local"
            }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Roadmap Routes
@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    try:
        week = request.args.get('week')
        
        if week:
            if week in DSA_ROADMAP:
                return jsonify(DSA_ROADMAP[week]), 200
            else:
                return jsonify({"error": "Week not found"}), 404
        else:
            return jsonify(DSA_ROADMAP), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/roadmap/weeks', methods=['GET'])
def get_roadmap_overview():
    try:
        overview = {}
        for week_key, week_data in DSA_ROADMAP.items():
            overview[week_key] = {
                "title": week_data["title"],
                "goal": week_data["goal"],
                "total_days": len(week_data["days"]),
                "topics": [day_data["topic"] for day_data in week_data["days"].values()]
            }
        
        return jsonify(overview), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/roadmap/day/<week>/<day>', methods=['GET'])
def get_day_details(week, day):
    try:
        if week in DSA_ROADMAP and day in DSA_ROADMAP[week]["days"]:
            day_data = DSA_ROADMAP[week]["days"][day]
            day_data["week_title"] = DSA_ROADMAP[week]["title"]
            day_data["week_goal"] = DSA_ROADMAP[week]["goal"]
            return jsonify(day_data), 200
        else:
            return jsonify({"error": "Week or day not found"}), 404
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Practice Platforms Route
@app.route('/api/practice', methods=['GET'])
def get_practice_platforms():
    try:
        category = request.args.get('category')
        
        if category and category in PRACTICE_PLATFORMS:
            return jsonify(PRACTICE_PLATFORMS[category]), 200
        else:
            return jsonify(PRACTICE_PLATFORMS), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Achievements Routes
@app.route('/api/achievements', methods=['GET'])
@token_required
def get_achievements(current_user):
    try:
        achievements = list(mongo.db.achievements.find({"uid": current_user}).sort("earned_at", -1))
        return jsonify([serialize_doc(achievement) for achievement in achievements]), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/stats', methods=['GET'])
@token_required
def get_user_stats(current_user):
    try:
        user = mongo.db.users.find_one({"uid": current_user})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get progress statistics
        total_completed = mongo.db.progress.count_documents({
            "uid": current_user,
            "completed": True
        })
        
        total_time = mongo.db.progress.aggregate([
            {"$match": {"uid": current_user}},
            {"$group": {"_id": None, "total": {"$sum": "$time_spent"}}}
        ])
        total_time = list(total_time)
        total_time_spent = total_time[0]["total"] if total_time else 0
        
        # Get weekly progress
        weekly_progress = mongo.db.progress.aggregate([
            {"$match": {"uid": current_user, "completed": True}},
            {"$group": {
                "_id": "$week",
                "completed_days": {"$sum": 1},
                "total_time": {"$sum": "$time_spent"}
            }},
            {"$sort": {"_id": 1}}
        ])
        
        # Get completion percentage
        total_topics = sum(len(week_data["days"]) for week_data in DSA_ROADMAP.values())
        completion_percentage = (total_completed / total_topics) * 100 if total_topics > 0 else 0
        
        stats = {
            "user_info": serialize_doc(user),
            "total_completed_topics": total_completed,
            "total_topics": total_topics,
            "completion_percentage": round(completion_percentage, 2),
            "total_time_spent": total_time_spent,
            "current_streak": user.get("current_streak", 0),
            "total_streak": user.get("total_streak", 0),
            "level": user.get("level", 1),
            "experience": user.get("experience", 0),
            "weekly_progress": list(weekly_progress),
            "achievement_count": len(user.get("achievements", [])),
            "preferences": user.get("preferences", {})
        }
        
        return jsonify(stats), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Review Topics Route
@app.route('/api/review', methods=['GET'])
@token_required
def get_review_topics(current_user):
    try:
        # Get topics marked for review
        review_notes = list(mongo.db.notes.find({
            "uid": current_user,
            "review_needed": True
        }).sort("updated_at", -1))
        
        # Get topics with low performance (not completed or low time spent)
        weak_topics = list(mongo.db.progress.find({
            "uid": current_user,
            "$or": [
                {"completed": False},
                {"time_spent": {"$lt": 1}}  # Less than 1 hour
            ]
        }).sort("updated_at", -1))
        
        # Get topics with low difficulty rating
        difficult_topics = list(mongo.db.progress.find({
            "uid": current_user,
            "difficulty_rating": {"$gte": 4}  # Rated 4 or 5 stars difficulty
        }).sort("difficulty_rating", -1))
        
        return jsonify({
            "review_notes": [serialize_doc(note) for note in review_notes],
            "weak_topics": [serialize_doc(topic) for topic in weak_topics],
            "difficult_topics": [serialize_doc(topic) for topic in difficult_topics]
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Search Route
@app.route('/api/search', methods=['GET'])
@token_required
def search_content(current_user):
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({"error": "Search query required"}), 400
        
        # Search in notes
        notes = list(mongo.db.notes.find({
            "uid": current_user,
            "$or": [
                {"content": {"$regex": query, "$options": "i"}},
                {"topic": {"$regex": query, "$options": "i"}},
                {"tags": {"$in": [query]}}
            ]
        }).limit(20))
        
        # Search in roadmap
        roadmap_results = []
        for week_key, week_data in DSA_ROADMAP.items():
            for day_key, day_data in week_data["days"].items():
                if (query.lower() in day_data["topic"].lower() or 
                    query.lower() in day_data["activities"].lower()):
                    roadmap_results.append({
                        "week": week_key,
                        "day": day_key,
                        "topic": day_data["topic"],
                        "activities": day_data["activities"],
                        "week_title": week_data["title"]
                    })
        
        # Search in resources
        resource_results = []
        for week_key, week_data in DSA_ROADMAP.items():
            for day_key, day_data in week_data["days"].items():
                for resource in day_data.get("resources", []):
                    if query.lower() in resource["name"].lower():
                        resource_results.append({
                            "week": week_key,
                            "day": day_key,
                            "resource": resource,
                            "topic": day_data["topic"]
                        })
        
        return jsonify({
            "notes": [serialize_doc(note) for note in notes],
            "roadmap": roadmap_results[:10],  # Limit roadmap results
            "resources": resource_results[:10]  # Limit resource results
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Analytics Route
@app.route('/api/analytics', methods=['GET'])
@token_required
def get_analytics(current_user):
    try:
        # Time-based analytics
        daily_progress = mongo.db.progress.aggregate([
            {"$match": {"uid": current_user, "completed": True}},
            {"$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$updated_at"
                    }
                },
                "topics_completed": {"$sum": 1},
                "time_spent": {"$sum": "$time_spent"}
            }},
            {"$sort": {"_id": 1}},
            {"$limit": 30}  # Last 30 days
        ])
        
        # Topic-wise analytics
        topic_analytics = mongo.db.progress.aggregate([
            {"$match": {"uid": current_user}},
            {"$group": {
                "_id": "$topic",
                "total_time": {"$sum": "$time_spent"},
                "completed": {"$sum": {"$cond": ["$completed", 1, 0]}},
                "attempts": {"$sum": 1},
                "avg_difficulty": {"$avg": "$difficulty_rating"}
            }},
            {"$sort": {"total_time": -1}},
            {"$limit": 10}
        ])
        
        # Weekly analytics
        weekly_analytics = mongo.db.progress.aggregate([
            {"$match": {"uid": current_user}},
            {"$group": {
                "_id": "$week",
                "total_time": {"$sum": "$time_spent"},
                "completed_topics": {"$sum": {"$cond": ["$completed", 1, 0]}},
                "total_topics": {"$sum": 1}
            }},
            {"$addFields": {
                "completion_rate": {
                    "$multiply": [
                        {"$divide": ["$completed_topics", "$total_topics"]},
                        100
                    ]
                }
            }},
            {"$sort": {"_id": 1}}
        ])
        
        return jsonify({
            "daily_progress": list(daily_progress),
            "topic_analytics": list(topic_analytics),
            "weekly_analytics": list(weekly_analytics)
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Leaderboard Route
@app.route('/api/leaderboard', methods=['GET'])
@token_required
def get_leaderboard(current_user):
    try:
        # Get top users by experience
        top_users = list(mongo.db.users.find(
            {},
            {"display_name": 1, "level": 1, "experience": 1, "current_streak": 1}
        ).sort("experience", -1).limit(10))
        
        # Get current user's rank
        user_rank = mongo.db.users.count_documents({
            "experience": {"$gt": mongo.db.users.find_one({"uid": current_user})["experience"]}
        }) + 1
        
        return jsonify({
            "top_users": [serialize_doc(user) for user in top_users],
            "user_rank": user_rank
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Export Data Route
@app.route('/api/export', methods=['GET'])
@token_required
def export_data(current_user):
    try:
        # Get all user data
        user = mongo.db.users.find_one({"uid": current_user})
        progress = list(mongo.db.progress.find({"uid": current_user}))
        notes = list(mongo.db.notes.find({"uid": current_user}))
        achievements = list(mongo.db.achievements.find({"uid": current_user}))
        calendar_events = list(mongo.db.calendar_events.find({"uid": current_user}))
        
        export_data = {
            "user_profile": serialize_doc(user),
            "progress": [serialize_doc(p) for p in progress],
            "notes": [serialize_doc(n) for n in notes],
            "achievements": [serialize_doc(a) for a in achievements],
            "calendar_events": [serialize_doc(e) for e in calendar_events],
            "roadmap_data": DSA_ROADMAP,
            "practice_platforms": PRACTICE_PLATFORMS,
            "exported_at": datetime.utcnow().isoformat(),
            "export_version": "1.0"
        }
        
        return jsonify(export_data), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Import Data Route
@app.route('/api/import', methods=['POST'])
@token_required
def import_data(current_user):
    try:
        data = request.get_json()
        
        # Validate import data
        if not data or 'export_version' not in data:
            return jsonify({"error": "Invalid import data"}), 400
        
        # Import progress
        if 'progress' in data:
            for progress_item in data['progress']:
                progress_item['uid'] = current_user
                progress_item.pop('_id', None)  # Remove old ID
                mongo.db.progress.insert_one(progress_item)
        
        # Import notes
        if 'notes' in data:
            for note in data['notes']:
                note['uid'] = current_user
                note.pop('_id', None)  # Remove old ID
                mongo.db.notes.insert_one(note)
        
        # Import calendar events
        if 'calendar_events' in data:
            for event in data['calendar_events']:
                event['uid'] = current_user
                event.pop('_id', None)  # Remove old ID
                mongo.db.calendar_events.insert_one(event)
        
        return jsonify({"message": "Data imported successfully"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# User Preferences Route
@app.route('/api/user/preferences', methods=['GET', 'PUT'])
@token_required
def user_preferences(current_user):
    try:
        if request.method == 'GET':
            user = mongo.db.users.find_one({"uid": current_user})
            if user:
                return jsonify(user.get('preferences', {})), 200
            else:
                return jsonify({"error": "User not found"}), 404
        
        elif request.method == 'PUT':
            data = request.get_json()
            preferences = {
                "difficulty": data.get('difficulty', 'beginner'),
                "daily_goal_hours": data.get('daily_goal_hours', 2),
                "notifications": data.get('notifications', True),
                "theme": data.get('theme', 'light'),
                "timezone": data.get('timezone', 'UTC'),
                "language": data.get('language', 'python')
            }
            
            mongo.db.users.update_one(
                {"uid": current_user},
                {"$set": {"preferences": preferences}}
            )
            
            return jsonify({"message": "Preferences updated successfully"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Health Check
@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        mongo.db.command('ismaster')
        db_status = "connected"
    except:
        db_status = "disconnected"
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "firebase": "connected",
        "api_version": "1.0.0",
        "roadmap_weeks": len(DSA_ROADMAP),
        "total_topics": sum(len(week_data["days"]) for week_data in DSA_ROADMAP.values())
    }), 200

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)