# backend/app.py
import os
import json
import secrets
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Dict, Any, Optional, List
import re
from urllib.parse import urlparse

from flask import Flask, request, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_mail import Mail, Message
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import jwt
from sqlalchemy import func, and_, or_, extract
from sqlalchemy.dialects.postgresql import UUID
import uuid
import cloudinary
import cloudinary.uploader
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import redis
from datetime import date

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configuration
class Config:
    # Basic Flask config
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    
    # Database - Render PostgreSQL
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///dsa_prep.db')
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
    }
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_hex(32)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Mail Configuration (Gmail SMTP)
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')  # App-specific password
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', MAIL_USERNAME)
    
    # Cloudinary Configuration (for avatar uploads)
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')
    
    # Redis Configuration
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    # App Configuration
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://dsa-learningdaily.vercel.app')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = REDIS_URL if os.environ.get('REDIS_URL') else 'memory://'

app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
mail = Mail(app)
cache = Cache(app, config={'CACHE_TYPE': 'simple'})
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri=app.config['RATELIMIT_STORAGE_URL']
)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": [app.config['FRONTEND_URL']],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configure Cloudinary
if all([app.config['CLOUDINARY_CLOUD_NAME'], 
        app.config['CLOUDINARY_API_KEY'], 
        app.config['CLOUDINARY_API_SECRET']]):
    cloudinary.config(
        cloud_name=app.config['CLOUDINARY_CLOUD_NAME'],
        api_key=app.config['CLOUDINARY_API_KEY'],
        api_secret=app.config['CLOUDINARY_API_SECRET']
    )

# Initialize scheduler for background tasks
scheduler = BackgroundScheduler()
scheduler.start()

RESOURCES = {
    # Text Resources
    "w3_python_getstarted": {"title": "Python Setup - W3Schools", "url": "https://www.w3schools.com/python/python_getstarted.asp", "type": "text"},
    "jt_cpp_tutorial": {"title": "C++ Setup - JavaTpoint", "url": "https://www.javatpoint.com/cpp-tutorial", "type": "text"},
    "w3_python_syntax": {"title": "Python Syntax - W3Schools", "url": "https://www.w3schools.com/python/python_syntax.asp", "type": "text"},
    "programiz_cpp_basics": {"title": "C++ Basics - Programiz", "url": "https://www.programiz.com/cpp-programming", "type": "text"},
    "w3_python_user_input": {"title": "Python I/O - W3Schools", "url": "https://www.w3schools.com/python/python_user_input.asp", "type": "text"},
    "jt_cpp_io": {"title": "C++ I/O - JavaTpoint", "url": "https://www.javatpoint.com/cpp-basic-input-output", "type": "text"},
    "w3_python_functions": {"title": "Python Functions - W3Schools", "url": "https://www.w3schools.com/python/python_functions.asp", "type": "text"},
    "tutsp_cpp_functions": {"title": "C++ Functions - TutorialsPoint", "url": "https://www.tutorialspoint.com/cplusplus/cpp_functions.htm", "type": "text"},
    "w3_python_lists": {"title": "Python Lists - W3Schools", "url": "https://www.w3schools.com/python/python_lists.asp", "type": "text"},
    "programiz_cpp_arrays": {"title": "C++ Arrays - Programiz", "url": "https://www.programiz.com/cpp-programming/arrays", "type": "text"},
    "w3_dsa_arrays": {"title": "Arrays - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_arrays.php", "type": "text"},
    "w3_python_strings": {"title": "Strings - W3Schools", "url": "https://www.w3schools.com/python/python_strings.asp", "type": "text"},
    "jt_string_ds": {"title": "String DS - JavaTpoint", "url": "https://www.javatpoint.com/string-in-data-structure", "type": "text"},
    "w3_ll": {"title": "Linked Lists - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_linkedlists.php", "type": "text"},
    "jt_singly_ll": {"title": "Singly LL - JavaTpoint", "url": "https://www.javatpoint.com/singly-linked-list", "type": "text"},
    "programiz_ll": {"title": "LL Operations - Programiz", "url": "https://www.programiz.com/dsa/linked-list", "type": "text"},
    "tutsp_ll_algos": {"title": "LL Algorithms - TutorialsPoint", "url": "https://www.tutorialspoint.com/data_structures_algorithms/linked_list_algorithms.htm", "type": "text"},
    "w3_stacks": {"title": "Stacks - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_stacks.php", "type": "text"},
    "jt_stack": {"title": "Stack Tutorial - JavaTpoint", "url": "https://www.javatpoint.com/data-structure-stack", "type": "text"},
    "programiz_stack": {"title": "Stack Applications - Programiz", "url": "https://www.programiz.com/dsa/stack", "type": "text"},
    "tutsp_stack_algo": {"title": "Stack Algorithm - TutorialsPoint", "url": "https://www.tutorialspoint.com/data_structures_algorithms/stack_algorithm.htm", "type": "text"},
    "w3_queues": {"title": "Queues - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_queues.php", "type": "text"},
    "jt_queue": {"title": "Queue - JavaTpoint", "url": "https://www.javatpoint.com/data-structure-queue", "type": "text"},
    "w3_trees": {"title": "Trees - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_data_trees.php", "type": "text"},
    "jt_binary_tree": {"title": "Binary Trees - JavaTpoint", "url": "https://www.javatpoint.com/binary-tree", "type": "text"},
    "programiz_tree_traversal": {"title": "Tree Traversal - Programiz", "url": "https://www.programiz.com/dsa/tree-traversal", "type": "text"},
    "tutsp_tree_traversal": {"title": "Tree Traversal - TutorialsPoint", "url": "https://www.tutorialspoint.com/data_structures_algorithms/tree_traversal.htm", "type": "text"},
    "w3_bfs": {"title": "BFS - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_algo_graphs_bfs.php", "type": "text"},
    "jt_tree_ds": {"title": "Tree DS - JavaTpoint", "url": "https://www.javatpoint.com/tree-data-structure", "type": "text"},
    "programiz_binary_tree": {"title": "Binary Tree Ops - Programiz", "url": "https://www.programiz.com/dsa/binary-tree", "type": "text"},
    "jt_doubly_ll": {"title": "Doubly LL - JavaTpoint", "url": "https://www.javatpoint.com/doubly-linked-list", "type": "text"},
    "programiz_circular_ll": {"title": "Circular LL - Programiz", "url": "https://www.programiz.com/dsa/circular-linked-list", "type": "text"},
    "programiz_two_pointers": {"title": "Two Pointers - Programiz", "url": "https://www.programiz.com/dsa/two-pointers-technique", "type": "text"},
    "programiz_priority_queue": {"title": "Priority Queue - Programiz", "url": "https://www.programiz.com/dsa/priority-queue", "type": "text"},
    "tutsp_sliding_window": {"title": "Sliding Window - TutorialsPoint", "url": "https://www.tutorialspoint.com/sliding-window-technique", "type": "text"},
    "w3_dsa_exercises": {"title": "DSA Exercises - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_exercises.php", "type": "practice"},
    "w3_reverse_ll_examples": {"title": "Reverse LL Examples - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_linkedlists_reverse.php", "type": "text"},
    "w3_ll_exercises": {"title": "LL Exercises - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_exercises_linkedlists.php", "type": "practice"},
    "w3_stack_exercises": {"title": "Stack Exercises - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_exercises_stacks.php", "type": "practice"},
    "w3_tree_exercises": {"title": "Tree Exercises - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_exercises_trees.php", "type": "practice"},
    
    # Visualizations
    "galles_array_vis": {"title": "Array Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Array.html", "type": "interactive"},
    "galles_bst": {"title": "BST Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/BST.html", "type": "interactive"},
    "galles_heap": {"title": "Heap Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Heap.html", "type": "interactive"},
    "galles_open_hash": {"title": "Hash Table Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/OpenHash.html", "type": "interactive"},
    "galles_dfs": {"title": "DFS Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/DFS.html", "type": "interactive"},
    "galles_bfs": {"title": "BFS Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/BFS.html", "type": "interactive"},
    "galles_dijkstra": {"title": "Dijkstra Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Dijkstra.html", "type": "interactive"},
    "galles_sorting": {"title": "Sorting Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/ComparisonSort.html", "type": "interactive"},
    "galles_nqueens": {"title": "N-Queens Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/RecQueens.html", "type": "interactive"},
    "galles_trie": {"title": "Trie Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Trie.html", "type": "interactive"},
    "visualgo_avl": {"title": "AVL Trees - VisuAlgo", "url": "https://visualgo.net/en/bst", "type": "interactive"},
    "visualgo_sssp": {"title": "SSSP - VisuAlgo", "url": "https://visualgo.net/en/sssp", "type": "interactive"},
    "visualgo_mst": {"title": "MST - VisuAlgo", "url": "https://visualgo.net/en/mst", "type": "interactive"},
    "visualgo_sorting": {"title": "Sorting - VisuAlgo", "url": "https://visualgo.net/en/sorting", "type": "interactive"},
    "visualgo_graphds": {"title": "Graph DS - VisuAlgo", "url": "https://visualgo.net/en/graphds", "type": "interactive"},
    "visualgo_ufds": {"title": "Union-Find - VisuAlgo", "url": "https://visualgo.net/en/ufds", "type": "interactive"},
    
    # Video Resources
    "yt_neetcode_two_pointers": {"title": "Two Pointers - NeetCode", "url": "https://www.youtube.com/watch?v=jzZsG8n2R9A", "type": "video"},
    "yt_abdul_bari_bst": {"title": "BST - Abdul Bari", "url": "https://www.youtube.com/watch?v=pYT9F8_LFTM", "type": "video"},
    "yt_neetcode_validate_bst": {"title": "Validate BST - NeetCode", "url": "https://www.youtube.com/watch?v=s6ATEkipzow", "type": "video"},
    "yt_abdul_bari_heap": {"title": "Heap - Abdul Bari", "url": "https://www.youtube.com/watch?v=HqPJF2L5h9U", "type": "video"},
    "yt_csdojo_hash": {"title": "Hash Tables - CS Dojo", "url": "https://www.youtube.com/watch?v=shs0KM3wKv8", "type": "video"},
    "yt_csdojo_graph_theory": {"title": "Graph Theory - CS Dojo", "url": "https://www.youtube.com/watch?v=gXgEDyodOJU", "type": "video"},
    "yt_abdul_bari_dijkstra": {"title": "Dijkstra - Abdul Bari", "url": "https://www.youtube.com/watch?v=XB4MIexjvY0", "type": "video"},
    "yt_mycodeschool_merge": {"title": "Merge Sort - mycodeschool", "url": "https://www.youtube.com/watch?v=JSceec-wEyw", "type": "video"},
    "yt_neetcode_binary_search": {"title": "Binary Search - NeetCode", "url": "https://www.youtube.com/watch?v=s4DPM8ct1pI", "type": "video"},
    "yt_csdojo_recursion": {"title": "Recursion - CS Dojo", "url": "https://www.youtube.com/watch?v=KEEKn7Me-ms", "type": "video"},
    "yt_neetcode_backtracking": {"title": "Backtracking - NeetCode", "url": "https://www.youtube.com/watch?v=pfiQ_PS1g8E", "type": "video"},
    "yt_neetcode_dp": {"title": "DP Fundamentals - NeetCode", "url": "https://www.youtube.com/watch?v=oBt53YbR9Kk", "type": "video"},
    "yt_knapsack": {"title": "Knapsack Problem", "url": "https://www.youtube.com/watch?v=8LusJS5-AGo", "type": "video"},
    "yt_bit_manip": {"title": "Bit Manipulation", "url": "https://www.youtube.com/watch?v=NLKQEOgBAnw", "type": "video"},
    
    # GeeksforGeeks Resources
    "gfg_sliding_window": {"title": "Sliding Window - GFG", "url": "https://www.geeksforgeeks.org/window-sliding-technique/", "type": "text"},
    "gfg_reverse_ll": {"title": "Reverse LL - GFG", "url": "https://www.geeksforgeeks.org/reverse-a-linked-list/", "type": "text"},
    "gfg_deque_intro": {"title": "Deque Introduction - GFG", "url": "https://www.geeksforgeeks.org/deque-set-1-introduction-applications/", "type": "text"},
    "gfg_tree_traversals": {"title": "Tree Traversals - GFG", "url": "https://www.geeksforgeeks.org/tree-traversals-inorder-preorder-and-postorder/", "type": "text"},
    "gfg_bst": {"title": "BST Operations - GFG", "url": "https://www.geeksforgeeks.org/binary-search-tree-data-structure/", "type": "text"},
    "gfg_binary_heap": {"title": "Binary Heap - GFG", "url": "https://www.geeksforgeeks.org/binary-heap/", "type": "text"},
    "gfg_hashing": {"title": "Hashing DS - GFG", "url": "https://www.geeksforgeeks.org/hashing-data-structure/", "type": "text"},
    "gfg_rolling_hash": {"title": "Rolling Hash - GFG", "url": "https://www.geeksforgeeks.org/rolling-hash-to-find-lexicographically-smallest-substring/", "type": "text"},
    "gfg_graph_apps": {"title": "Graph Applications - GFG", "url": "https://www.geeksforgeeks.org/applications-of-graph-data-structure/", "type": "text"},
    "gfg_floyd_warshall": {"title": "Floyd-Warshall - GFG", "url": "https://www.geeksforgeeks.org/floyd-warshall-algorithm-dp-16/", "type": "text"},
    "gfg_toposort": {"title": "Topological Sort - GFG", "url": "https://www.geeksforgeeks.org/topological-sorting/", "type": "text"},
    "gfg_ternary_search": {"title": "Ternary Search - GFG", "url": "https://www.geeksforgeeks.org/ternary-search/", "type": "text"},
    "gfg_lcs": {"title": "LCS - GFG", "url": "https://www.geeksforgeeks.org/longest-common-subsequence-dp-4/", "type": "text"},
    "gfg_greedy": {"title": "Greedy Algorithms - GFG", "url": "https://www.geeksforgeeks.org/greedy-algorithms/", "type": "text"},
    
    # LeetCode Problems
    "lc_1_two_sum": {"title": "Two Sum - LeetCode", "url": "https://leetcode.com/problems/two-sum/", "type": "practice"},
    "lc_206_reverse_ll": {"title": "Reverse LL - LeetCode", "url": "https://leetcode.com/problems/reverse-linked-list/", "type": "practice"},
    "lc_20_valid_parentheses": {"title": "Valid Parentheses - LeetCode", "url": "https://leetcode.com/problems/valid-parentheses/", "type": "practice"},
    "lc_104_max_depth": {"title": "Max Depth - LeetCode", "url": "https://leetcode.com/problems/maximum-depth-of-binary-tree/", "type": "practice"},
    "lc_98_validate_bst": {"title": "Validate BST - LeetCode", "url": "https://leetcode.com/problems/validate-binary-search-tree/", "type": "practice"},
    "lc_235_lca_bst": {"title": "LCA BST - LeetCode", "url": "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/", "type": "practice"},
    "lc_215_kth_largest": {"title": "Kth Largest - LeetCode", "url": "https://leetcode.com/problems/kth-largest-element-in-an-array/", "type": "practice"},
    "lc_23_merge_k_sorted": {"title": "Merge K Lists - LeetCode", "url": "https://leetcode.com/problems/merge-k-sorted-lists/", "type": "practice"},
    "lc_49_group_anagrams": {"title": "Group Anagrams - LeetCode", "url": "https://leetcode.com/problems/group-anagrams/", "type": "practice"},
    "lc_200_islands": {"title": "Number of Islands - LeetCode", "url": "https://leetcode.com/problems/number-of-islands/", "type": "practice"},
    "lc_133_clone_graph": {"title": "Clone Graph - LeetCode", "url": "https://leetcode.com/problems/clone-graph/", "type": "practice"},
    "lc_78_subsets": {"title": "Subsets - LeetCode", "url": "https://leetcode.com/problems/subsets/", "type": "practice"},
    "lc_46_permutations": {"title": "Permutations - LeetCode", "url": "https://leetcode.com/problems/permutations/", "type": "practice"},
    "lc_300_lis": {"title": "LIS - LeetCode", "url": "https://leetcode.com/problems/longest-increasing-subsequence/", "type": "practice"},
    
    # Other Resources
    "python_heapq": {"title": "Python heapq", "url": "https://docs.python.org/3/library/heapq.html", "type": "text"},
    "py_dict": {"title": "Python Dictionaries", "url": "https://docs.python.org/3/tutorial/datastructures.html#dictionaries", "type": "text"},
    "pythontutor": {"title": "Python Tutor", "url": "http://pythontutor.com", "type": "interactive"},
    "leetcode_dp_patterns": {"title": "DP Patterns", "url": "https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns", "type": "practice"},
    "system_design_primer": {"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "type": "text"},
}

ROADMAP = [
    {
        "week": 1,
        "title": "Foundation & Environment",
        "goal": "Set up development environment and basic programming concepts",
        "project": {"title": "Scientific Calculator","description": "Build a calculator with basic and advanced operations","skills": ["Arrays", "Functions", "Error handling"]},
        "days": [
            {
                "day": "Monday","topic": "Environment Setup","activities": "Install Python/C++, Git, IDE setup","resources": ["w3_python_getstarted", "jt_cpp_tutorial"],"time_estimate": 120
            },
            {
                "day": "Tuesday","topic": "Basic Syntax","activities": "Variables, data types, operators","resources": ["w3_python_syntax", "programiz_cpp_basics"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Input/Output","activities": "File I/O, console I/O, formatting","resources": ["w3_python_user_input", "jt_cpp_io"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Functions","activities": "Function definition, parameters, scope","resources": ["w3_python_functions", "tutsp_cpp_functions"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Arrays/Lists Basics","activities": "Creation, indexing, basic operations","resources": ["w3_python_lists", "programiz_cpp_arrays"],"time_estimate": 90
            },
            {
                "day": "Saturday","topic": "Project Start: Scientific Calculator","activities": "Plan features, basic arithmetic","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Scientific Calculator","activities": "Advanced operations, error handling","resources": [],"time_estimate": 180
            }
        ]
    },
    {
        "week": 2,
        "title": "Arrays & String Mastery",
        "goal": "Master array operations and string manipulation",
        "project": {
            "title": "Text Analyzer","description": "Build a text analysis tool with word frequency and pattern detection","skills": ["String processing", "Two pointers", "Sliding window"]
        },
        "days": [
            {
                "day": "Monday","topic": "Array Operations","activities": "Iteration, searching, basic algorithms","resources": ["w3_dsa_arrays", "galles_array_vis"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Two Pointers Technique","activities": "Two Sum, reverse array, palindrome","resources": ["programiz_two_pointers", "yt_neetcode_two_pointers"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "String Processing","activities": "Manipulation, pattern matching basics","resources": ["w3_python_strings", "jt_string_ds"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Sliding Window","activities": "Maximum subarray, longest substring","resources": ["gfg_sliding_window", "tutsp_sliding_window"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Two Sum, Longest Substring, Valid Palindrome","resources": ["w3_dsa_exercises", "lc_1_two_sum"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Text Analyzer","activities": "Word count, frequency analysis","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Text Analyzer","activities": "Pattern detection, statistics","resources": [],"time_estimate": 180
            }]},
    {
        "week": 3,
        "title": "Linked Lists Deep Dive",
        "goal": "Master linked list operations and applications",
        "project": {
            "title": "Music Playlist Manager","description": "Implement a playlist system using linked lists","skills": ["Linked list operations", "Doubly linked lists", "Circular lists"]
        },
        "days": [
            {
                "day": "Monday","topic": "Linked List Basics","activities": "Node structure, traversal","resources": ["w3_ll", "jt_singly_ll"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Singly Linked Lists","activities": "Insert, delete, search operations","resources": ["programiz_ll", "tutsp_ll_algos"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Reverse & Manipulation","activities": "Reverse list, merge, cycle detection","resources": ["gfg_reverse_ll", "w3_reverse_ll_examples"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Doubly & Circular Lists","activities": "Advanced variations and use cases","resources": ["jt_doubly_ll", "programiz_circular_ll"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Reverse, Merge Two Lists, Cycle Detection","resources": ["w3_ll_exercises", "lc_206_reverse_ll"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Music Playlist Manager","activities": "Song management using linked lists","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Music Playlist Manager","activities": "Shuffle, repeat, playlist operations","resources": [],"time_estimate": 180
            }]},
    {
        "week": 4,
        "title": "Stacks & Queues Applications",
        "goal": "Understand LIFO/FIFO operations and real-world applications",
        "project": {
            "title": "Code Editor","description": "Build an editor with undo/redo and bracket matching","skills": ["Stack operations", "Expression evaluation", "Queue applications"]
        },
        "days": [
            {
                "day": "Monday","topic": "Stack Fundamentals","activities": "LIFO operations, implementation","resources": ["w3_stacks", "jt_stack"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Stack Applications","activities": "Expression evaluation, parentheses matching","resources": ["programiz_stack", "tutsp_stack_algo"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Queue Fundamentals","activities": "FIFO operations, circular queues","resources": ["w3_queues", "jt_queue"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Advanced Queues","activities": "Deque, priority queue introduction","resources": ["gfg_deque_intro", "programiz_priority_queue"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Valid Parentheses, Min Stack","resources": ["w3_stack_exercises", "lc_20_valid_parentheses"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Code Editor","activities": "Undo/redo functionality using stacks","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Code Editor","activities": "Bracket matching, syntax validation","resources": [],"time_estimate": 180
            }   ] },
    {
        "week": 5,
        "title": "Binary Trees Foundation",
        "goal": "Master tree traversals and basic tree operations",
        "project": {
            "title": "Family Tree","description": "Create a genealogy tree with relationship queries","skills": ["Tree traversals", "DFS/BFS", "Tree properties"]
        },
        "days": [
            {
                "day": "Monday","topic": "Tree Basics","activities": "Terminology, node structure","resources": ["w3_trees", "jt_binary_tree"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Tree Traversals (DFS)","activities": "Preorder, inorder, postorder","resources": ["programiz_tree_traversal", "gfg_tree_traversals"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Level Order (BFS)","activities": "Breadth-first traversal using queues","resources": ["tutsp_tree_traversal", "w3_bfs"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Tree Properties","activities": "Height, depth, diameter calculations","resources": ["jt_tree_ds", "programiz_binary_tree"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Max Depth, Same Tree, Symmetric Tree","resources": ["w3_tree_exercises", "lc_104_max_depth"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Family Tree","activities": "Genealogy tree with traversals","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Family Tree","activities": "Relationship queries, tree visualization","resources": [],"time_estimate": 180
            }]},
    {
        "week": 6,
        "title": "Binary Search Trees",
        "goal": "Master BST operations and balanced tree concepts",
        "project": {
            "title": "Student Database","description": "BST-based student record management system","skills": ["BST operations", "Searching", "Tree balancing"]
        },
        "days": [
            {
                "day": "Monday","topic": "BST Properties","activities": "BST invariant, insertion, search","resources": ["galles_bst", "yt_abdul_bari_bst"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "BST Operations","activities": "Insert, delete, find operations","resources": ["gfg_bst"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "BST Validation","activities": "Validate BST, range checking","resources": ["yt_neetcode_validate_bst"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Balanced Trees","activities": "AVL introduction, rotation concepts","resources": ["visualgo_avl"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Validate BST, Lowest Common Ancestor","resources": ["lc_98_validate_bst", "lc_235_lca_bst"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Student Database","activities": "BST-based student record system","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Student Database","activities": "Search, grade analysis, reporting","resources": [],"time_estimate": 180
            }
        ]
    },
    {
        "week": 7,
        "title": "Heaps & Priority Queues",
        "goal": "Master heap operations and priority-based algorithms",
        "project": {
            "title": "Task Scheduler","description": "Priority-based task management system","skills": ["Heap operations", "Priority queues", "Top-K problems"]
        },
        "days": [
            {
                "day": "Monday","topic": "Heap Fundamentals","activities": "Min/max heap properties, heapify","resources": ["galles_heap", "yt_abdul_bari_heap"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Heap Operations","activities": "Insert, extract, build heap","resources": ["gfg_binary_heap"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Priority Queue","activities": "Implementation using heaps","resources": ["python_heapq"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Heap Applications","activities": "Top K elements, median finding","resources": ["lc_215_kth_largest"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Kth Largest, Merge K Lists","resources": ["lc_215_kth_largest", "lc_23_merge_k_sorted"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Task Scheduler","activities": "Priority-based task management","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Task Scheduler","activities": "Deadline handling, priority queues","resources": [],"time_estimate": 180
            }
        ]
    },
    {
        "week": 8,
        "title": "Hashing & Hash Tables",
        "goal": "Master hash-based data structures and fast lookups",
        "project": {
            "title": "Spell Checker","description": "Hash-based dictionary with word suggestions","skills": ["Hash functions", "Collision handling", "String matching"]
        },
        "days": [
            {
                "day": "Monday","topic": "Hashing Basics","activities": "Hash functions, collision handling","resources": ["galles_open_hash", "yt_csdojo_hash"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Hash Table Operations","activities": "Insert, search, delete with collisions","resources": ["gfg_hashing"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Hash Applications","activities": "Frequency counting, duplicate detection","resources": ["py_dict"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Advanced Hashing","activities": "Rolling hash, perfect hashing","resources": ["gfg_rolling_hash"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Two Sum, Group Anagrams, Valid Anagram","resources": ["lc_1_two_sum", "lc_49_group_anagrams"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Spell Checker","activities": "Hash-based dictionary and suggestions","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Spell Checker","activities": "Edit distance, word suggestions","resources": [],"time_estimate": 180
            }
        ]
    },
    {
        "week": 9,
        "title": "Graph Fundamentals",
        "goal": "Master graph representations and basic algorithms",
        "project": {
            "title": "Social Network","description": "Friend connections and suggestions system","skills": ["Graph traversals", "BFS/DFS", "Connected components"]
        },
        "days": [
            {
                "day": "Monday","topic": "Graph Basics","activities": "Representation, adjacency list/matrix","resources": ["visualgo_graphds", "yt_csdojo_graph_theory"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "DFS Implementation","activities": "Depth-first search, applications","resources": ["galles_dfs"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "BFS Implementation","activities": "Breadth-first search, shortest path","resources": ["galles_bfs"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Graph Applications","activities": "Connected components, cycle detection","resources": ["gfg_graph_apps"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Key Problems","activities": "Number of Islands, Clone Graph","resources": ["lc_200_islands", "lc_133_clone_graph"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Social Network","activities": "Friend connections using graphs","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Social Network","activities": "Friend suggestions, mutual connections","resources": [],"time_estimate": 180
            }
        ]
    },
    {
        "week": 10,
        "title": "Advanced Graph Algorithms",
        "goal": "Master shortest path and advanced graph algorithms",
        "project": {"title": "GPS Navigation","description": "Route finding and optimization system","skills": ["Dijkstra", "A*", "MST algorithms"]
        },
        "days": [
            {
                "day": "Monday","topic": "Dijkstra's Algorithm","activities": "Shortest path in weighted graphs","resources": ["galles_dijkstra", "yt_abdul_bari_dijkstra"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Bellman-Ford","activities": "Negative weight handling","resources": ["visualgo_sssp"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Floyd-Warshall","activities": "All-pairs shortest path","resources": ["gfg_floyd_warshall"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "MST Algorithms","activities": "Kruskal's and Prim's algorithms","resources": ["visualgo_mst"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Topological Sort","activities": "Ordering in DAGs","resources": ["gfg_toposort"],"time_estimate": 90
            },
            {
                "day": "Saturday","topic": "Project Start: GPS Navigation","activities": "Shortest path finder","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: GPS Navigation","activities": "Route optimization, traffic handling","resources": [],"time_estimate": 180
            }]},
    {
        "week": 11,
        "title": "Sorting & Searching Mastery",
        "goal": "Master all major sorting algorithms and binary search variations",
        "project": {
            "title": "Movie Database","description": "Efficient sorting and searching system","skills": ["Sorting algorithms", "Binary search", "Quick select"]
        },
        "days": [
            {
                "day": "Monday","topic": "Basic Sorting","activities": "Bubble, selection, insertion sort","resources": ["galles_sorting"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Merge Sort","activities": "Divide and conquer approach","resources": ["yt_mycodeschool_merge"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Quick Sort","activities": "Partitioning and optimization","resources": ["visualgo_sorting"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Binary Search","activities": "Search variations, bounds","resources": ["yt_neetcode_binary_search"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Advanced Searching","activities": "Ternary search, exponential search","resources": ["gfg_ternary_search"],"time_estimate": 90
            },
            {
                "day": "Saturday","topic": "Project Start: Movie Database","activities": "Sorting and searching optimization","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Movie Database","activities": "Multi-criteria sorting, fast queries","resources": [],"time_estimate": 180
            }]},
    {
        "week": 12,
        "title": "Recursion & Backtracking",
        "goal": "Master recursive problem-solving and backtracking patterns",
        "project": {"title": "Sudoku Solver","description": "Interactive puzzle solver with hints","skills": ["Recursion", "Backtracking", "Constraint solving"]},
        "days": [
            {
                "day": "Monday","topic": "Recursion Basics","activities": "Base cases, recursive thinking","resources": ["yt_csdojo_recursion"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Recursive Patterns","activities": "Tree recursion, memoization","resources": ["pythontutor"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "Backtracking Intro","activities": "Template, decision trees","resources": ["yt_neetcode_backtracking"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Classic Problems","activities": "N-Queens, Sudoku solver","resources": ["galles_nqueens"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "More Backtracking","activities": "Subsets, permutations, combinations","resources": ["lc_78_subsets", "lc_46_permutations"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Sudoku Solver","activities": "Interactive puzzle solver","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Sudoku Solver","activities": "Validation, hints, difficulty levels","resources": [],"time_estimate": 180
            }]},
    {
        "week": 13,
        "title": "Dynamic Programming",
        "goal": "Master DP patterns and optimization problems",
        "project": {
            "title": "Investment Calculator","description": "Financial optimization using DP","skills": ["DP patterns", "Optimization", "Memoization"]},
        "days": [
            {
                "day": "Monday","topic": "DP Fundamentals","activities": "Memoization vs tabulation","resources": ["yt_neetcode_dp"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Classic DP","activities": "Fibonacci, climbing stairs, coin change","resources": ["leetcode_dp_patterns"],"time_estimate": 90
            },
            {
                "day": "Wednesday","topic": "String DP","activities": "LCS, edit distance, palindromes","resources": ["gfg_lcs"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Knapsack Problems","activities": "0/1 and unbounded knapsack","resources": ["yt_knapsack"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "Advanced DP","activities": "LIS, maximum subarray, matrix chain","resources": ["lc_300_lis"],"time_estimate": 120
            },
            {
                "day": "Saturday","topic": "Project Start: Investment Calculator","activities": "DP-based financial optimization","resources": [],"time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Project Complete: Investment Calculator","activities": "Portfolio optimization, risk analysis","resources": [],"time_estimate": 180
            }]},
    {
        "week": 14,"title": "Advanced Topics & System Design","goal": "Integrate all concepts into a comprehensive system",
        "project": {"title": "File Compressor & Mini Database","description": "Apply multiple DSA concepts in real systems","skills": ["System design", "Algorithm selection", "Optimization"]},
        "days": [
            {
                "day": "Monday","topic": "Greedy Algorithms","activities": "Activity selection, Huffman coding","resources": ["gfg_greedy"],"time_estimate": 90
            },
            {
                "day": "Tuesday","topic": "Bit Manipulation","activities": "Bitwise operations, bit tricks","resources": ["yt_bit_manip"],"time_estimate": 90
            },
            {
                "day": "Wednesday", "topic": "Trie Data Structure","activities": "Prefix trees, autocomplete","resources": ["galles_trie"],"time_estimate": 90
            },
            {
                "day": "Thursday","topic": "Union-Find","activities": "Disjoint set operations","resources": ["visualgo_ufds"],"time_estimate": 90
            },
            {
                "day": "Friday","topic": "System Design Prep","activities": "Scalability, data structure choices","resources": ["system_design_primer"],"time_estimate": 90
            },
            {
                "day": "Saturday","topic": "Project Start: File Compressor","activities": "Huffman coding implementation","resources": [],   "time_estimate": 180
            },
            {
                "day": "Sunday","topic": "Final Project: Mini Database","activities": "Complete system with all DSA concepts","resources": [],"time_estimate": 180
            }
        ]
    }
]
# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    preferences = db.relationship('UserPreference', backref='user', uselist=False, cascade='all, delete-orphan')
    progress = db.relationship('Progress', backref='user', cascade='all, delete-orphan')
    streaks = db.relationship('Streak', backref='user', cascade='all, delete-orphan')
    pomodoro_logs = db.relationship('PomodoroLog', backref='user', cascade='all, delete-orphan')
    notes = db.relationship('Note', backref='user', cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', cascade='all, delete-orphan')
    calendar_events = db.relationship('CalendarEvent', backref='user', cascade='all, delete-orphan')
    study_plans = db.relationship('StudyPlan', backref='user', cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'email': self.email,
            'username': self.username,
            'avatar_url': self.avatar_url,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat()
        }

class UserPreference(db.Model):
    __tablename__ = 'user_preferences'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    theme = db.Column(db.String(20), default='light')
    layout = db.Column(db.String(20), default='default')
    email_notifications = db.Column(db.Boolean, default=True)
    push_notifications = db.Column(db.Boolean, default=True)
    daily_goal_minutes = db.Column(db.Integer, default=120)
    preferred_language = db.Column(db.String(10), default='python')
    timezone = db.Column(db.String(50), default='UTC')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Progress(db.Model):
    __tablename__ = 'progress'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    week = db.Column(db.Integer, nullable=False)
    day = db.Column(db.Integer, nullable=False)
    topic = db.Column(db.String(255), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    completion_date = db.Column(db.DateTime)
    time_spent = db.Column(db.Integer, default=0)  # in minutes
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'week', 'day', name='_user_week_day_uc'),)

class Streak(db.Model):
    __tablename__ = 'streaks'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    last_activity_date = db.Column(db.Date)
    total_days_active = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class PomodoroLog(db.Model):
    __tablename__ = 'pomodoro_logs'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    topic = db.Column(db.String(255))
    duration = db.Column(db.Integer, nullable=False)  # in minutes
    completed = db.Column(db.Boolean, default=True)
    started_at = db.Column(db.DateTime, nullable=False)
    ended_at = db.Column(db.DateTime)
    break_duration = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)

class Note(db.Model):
    __tablename__ = 'notes'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(255))
    week = db.Column(db.Integer)
    tags = db.Column(db.JSON)
    is_pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # streak, achievement, reminder, system
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    event_type = db.Column(db.String(50))  # study, project, deadline
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    recurring = db.Column(db.Boolean, default=False)
    recurrence_rule = db.Column(db.String(255))
    reminder_minutes = db.Column(db.Integer, default=30)
    color = db.Column(db.String(7))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StudyPlan(db.Model):
    __tablename__ = 'study_plans'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    plan_data = db.Column(db.JSON, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Helper Functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_token():
    return secrets.token_urlsafe(32)

def create_access_token(user_id):
    payload = {
        'user_id': str(user_id),
        'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def create_refresh_token(user_id):
    payload = {
        'user_id': str(user_id),
        'exp': datetime.utcnow() + app.config['JWT_REFRESH_TOKEN_EXPIRES'],
        'iat': datetime.utcnow(),
        'type': 'refresh'
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Decorators
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'message': 'Token is invalid or expired'}), 401
        
        current_user = User.query.get(payload['user_id'])
        if not current_user or not current_user.is_active:
            return jsonify({'message': 'User not found or inactive'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Email Functions
def send_email(subject, recipient, html_body):
    try:
        msg = Message(
            subject=subject,
            recipients=[recipient],
            html=html_body
        )
        mail.send(msg)
        return True
    except Exception as e:
        logger.error(f"Email sending failed: {str(e)}")
        return False

def send_reset_email(user, token):
    reset_url = f"{app.config['FRONTEND_URL']}/reset-password?token={token}"
    html = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Hello {user.username},</p>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <p><a href="{reset_url}">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
    </html>
    """
    send_email("Password Reset - DSA Prep", user.email, html)

def send_welcome_email(user):
    html = f"""
    <html>
        <body>
            <h2>Welcome to DSA Prep!</h2>
            <p>Hello {user.username},</p>
            <p>Welcome to your DSA learning journey! We're excited to have you.</p>
            <p>Get started by exploring the roadmap and tracking your progress.</p>
            <p>Happy learning!</p>
        </body>
    </html>
    """
    send_email("Welcome to DSA Prep", user.email, html)

# Background Tasks
def update_streaks():
    """Update user streaks daily"""
    with app.app_context():
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        users = User.query.filter_by(is_active=True).all()
        for user in users:
            streak = Streak.query.filter_by(user_id=user.id).first()
            if not streak:
                streak = Streak(user_id=user.id)
                db.session.add(streak)
            
            # Check if user was active today
            today_progress = Progress.query.filter(
                Progress.user_id == user.id,
                func.date(Progress.completion_date) == today,
                Progress.completed == True
            ).first()
            
            if today_progress:
                if streak.last_activity_date == yesterday:
                    streak.current_streak += 1
                elif streak.last_activity_date != today:
                    streak.current_streak = 1
                
                streak.last_activity_date = today
                streak.total_days_active += 1
                
                if streak.current_streak > streak.longest_streak:
                    streak.longest_streak = streak.current_streak
            else:
                # Check if streak should be reset
                if streak.last_activity_date and streak.last_activity_date < yesterday:
                    streak.current_streak = 0
        
        db.session.commit()

# Schedule daily streak update
scheduler.add_job(
    func=update_streaks,
    trigger=CronTrigger(hour=0, minute=0),
    id='update_streaks',
    name='Update user streaks',
    replace_existing=True
)

# Routes

# Health Check
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })

# Authentication Routes
@app.route('/auth/register', methods=['POST'])
@limiter.limit("5 per hour")
def register():
    try:
        data = request.get_json()
        
        # Validation
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not email or not username or not password:
            return jsonify({'message': 'All fields are required'}), 400
        
        # Email validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Password validation
        if len(password) < 8:
            return jsonify({'message': 'Password must be at least 8 characters'}), 400
        
        # Check existing user
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Email already registered'}), 409
        
        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username already taken'}), 409
        
        # Create user
        user = User(email=email, username=username)
        user.set_password(password)
        db.session.add(user)
        
        # Create default preferences
        preferences = UserPreference(user_id=user.id)
        db.session.add(preferences)
        
        # Create initial streak
        streak = Streak(user_id=user.id)
        db.session.add(streak)
        
        db.session.commit()
        
        # Send welcome email
        send_welcome_email(user)
        
        # Generate tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        
        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'message': 'Registration failed'}), 500

@app.route('/auth/login', methods=['POST'])
@limiter.limit("10 per hour")
def login():
    try:
        data = request.get_json()
        login = data.get('login', '').strip()  # Can be email or username
        password = data.get('password', '')
        
        if not login or not password:
            return jsonify({'message': 'Login and password required'}), 400
        
        # Find user by email or username
        user = User.query.filter(
            or_(User.email == login.lower(), User.username == login)
        ).first()
        
        if not user or not user.check_password(password):
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'message': 'Account is inactive'}), 403
        
        # Generate tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': 'Login failed'}), 500

@app.route('/auth/refresh', methods=['POST'])
def refresh_token():
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'message': 'Refresh token required'}), 400
        
        payload = decode_token(refresh_token)
        if not payload or payload.get('type') != 'refresh':
            return jsonify({'message': 'Invalid refresh token'}), 401
        
        user = User.query.get(payload['user_id'])
        if not user or not user.is_active:
            return jsonify({'message': 'User not found or inactive'}), 401
        
        # Generate new access token
        access_token = create_access_token(user.id)
        
        return jsonify({
            'access_token': access_token
        }), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'message': 'Token refresh failed'}), 500

@app.route('/auth/forgot-password', methods=['POST'])
@limiter.limit("3 per hour")
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'message': 'Email required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            # Don't reveal if email exists
            return jsonify({'message': 'If the email exists, a reset link has been sent'}), 200
        
        # Create reset token
        token = generate_token()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.session.add(reset_token)
        db.session.commit()
        
        # Send reset email
        send_reset_email(user, token)
        
        return jsonify({'message': 'If the email exists, a reset link has been sent'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Forgot password error: {str(e)}")
        return jsonify({'message': 'Request failed'}), 500

@app.route('/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'message': 'Token and password required'}), 400
        
        if len(new_password) < 8:
            return jsonify({'message': 'Password must be at least 8 characters'}), 400
        
        # Find valid token
        reset_token = PasswordResetToken.query.filter_by(
            token=token,
            used=False
        ).filter(
            PasswordResetToken.expires_at > datetime.utcnow()
        ).first()
        
        if not reset_token:
            return jsonify({'message': 'Invalid or expired token'}), 400
        
        # Update password
        user = User.query.get(reset_token.user_id)
        user.set_password(new_password)
        reset_token.used = True
        db.session.commit()
        
        return jsonify({'message': 'Password reset successful'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Reset password error: {str(e)}")
        return jsonify({'message': 'Password reset failed'}), 500

# Profile Routes
@app.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    try:
        preferences = UserPreference.query.filter_by(user_id=current_user.id).first()
        streak = Streak.query.filter_by(user_id=current_user.id).first()
        
        profile_data = {
            'user': current_user.to_dict(),
            'preferences': {
                'theme': preferences.theme if preferences else 'light',
                'layout': preferences.layout if preferences else 'default',
                'email_notifications': preferences.email_notifications if preferences else True,
                'push_notifications': preferences.push_notifications if preferences else True,
                'daily_goal_minutes': preferences.daily_goal_minutes if preferences else 120,
                'preferred_language': preferences.preferred_language if preferences else 'python',
                'timezone': preferences.timezone if preferences else 'UTC'
            },
            'streak': {
                'current': streak.current_streak if streak else 0,
                'longest': streak.longest_streak if streak else 0,
                'total_days': streak.total_days_active if streak else 0
            }
        }
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return jsonify({'message': 'Failed to fetch profile'}), 500

@app.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    try:
        data = request.get_json()
        
        # Update user info
        if 'username' in data:
            username = data['username'].strip()
            if username != current_user.username:
                if User.query.filter_by(username=username).first():
                    return jsonify({'message': 'Username already taken'}), 409
                current_user.username = username
        
        # Update preferences
        if 'preferences' in data:
            prefs = UserPreference.query.filter_by(user_id=current_user.id).first()
            if not prefs:
                prefs = UserPreference(user_id=current_user.id)
                db.session.add(prefs)
            
            pref_data = data['preferences']
            if 'theme' in pref_data:
                prefs.theme = pref_data['theme']
            if 'layout' in pref_data:
                prefs.layout = pref_data['layout']
            if 'email_notifications' in pref_data:
                prefs.email_notifications = pref_data['email_notifications']
            if 'push_notifications' in pref_data:
                prefs.push_notifications = pref_data['push_notifications']
            if 'daily_goal_minutes' in pref_data:
                prefs.daily_goal_minutes = pref_data['daily_goal_minutes']
            if 'preferred_language' in pref_data:
                prefs.preferred_language = pref_data['preferred_language']
            if 'timezone' in pref_data:
                prefs.timezone = pref_data['timezone']
        
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update profile error: {str(e)}")
        return jsonify({'message': 'Failed to update profile'}), 500

@app.route('/profile/upload-avatar', methods=['POST'])
@token_required
@limiter.limit("5 per hour")
def upload_avatar(current_user):
    try:
        if 'avatar' not in request.files:
            return jsonify({'message': 'No file provided'}), 400
        
        file = request.files['avatar']
        
        if file.filename == '':
            return jsonify({'message': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'message': 'Invalid file type'}), 400
        
        # Upload to Cloudinary
        if app.config['CLOUDINARY_CLOUD_NAME']:
            try:
                result = cloudinary.uploader.upload(
                    file,
                    folder=f"dsa-prep/avatars/{current_user.id}",
                    public_id=f"avatar_{current_user.id}",
                    overwrite=True,
                    transformation=[
                        {'width': 300, 'height': 300, 'crop': 'fill'},
                        {'quality': 'auto'}
                    ]
                )
                
                current_user.avatar_url = result['secure_url']
                db.session.commit()
                
                return jsonify({
                    'message': 'Avatar uploaded successfully',
                    'avatar_url': current_user.avatar_url
                }), 200
                
            except Exception as e:
                logger.error(f"Cloudinary upload error: {str(e)}")
                return jsonify({'message': 'Upload failed'}), 500
        else:
            return jsonify({'message': 'File upload not configured'}), 503
            
    except Exception as e:
        logger.error(f"Avatar upload error: {str(e)}")
        return jsonify({'message': 'Upload failed'}), 500

# Progress Routes
@app.route('/progress', methods=['GET'])
@token_required
def get_progress(current_user):
    try:
        progress_list = Progress.query.filter_by(user_id=current_user.id).all()
        
        progress_data = {}
        for p in progress_list:
            key = f"week{p.week}_day{p.day}"
            progress_data[key] = {
                'completed': p.completed,
                'completion_date': p.completion_date.isoformat() if p.completion_date else None,
                'time_spent': p.time_spent,
                'notes': p.notes
            }
        
        # Calculate overall statistics
        total_completed = len([p for p in progress_list if p.completed])
        total_time = sum(p.time_spent for p in progress_list)
        
        # Get current week progress
        current_week_progress = []
        for p in progress_list:
            if p.completed and p.completion_date:
                days_ago = (datetime.utcnow() - p.completion_date).days
                if days_ago <= 7:
                    current_week_progress.append(p)
        
        return jsonify({
            'progress': progress_data,
            'statistics': {
                'total_completed': total_completed,
                'total_time_minutes': total_time,
                'completion_percentage': round((total_completed / 98) * 100, 2),  # 14 weeks * 7 days
                'current_week_completed': len(current_week_progress)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get progress error: {str(e)}")
        return jsonify({'message': 'Failed to fetch progress'}), 500

@app.route('/progress', methods=['POST'])
@token_required
def update_progress(current_user):
    try:
        data = request.get_json()
        week = data.get('week')
        day = data.get('day')
        completed = data.get('completed', False)
        time_spent = data.get('time_spent', 0)
        notes = data.get('notes', '')
        
        if week is None or day is None:
            return jsonify({'message': 'Week and day required'}), 400
        
        # Find or create progress entry
        progress = Progress.query.filter_by(
            user_id=current_user.id,
            week=week,
            day=day
        ).first()
        
        if not progress:
            # Get topic from roadmap
            topic = "Unknown"
            if week <= len(ROADMAP):
                week_data = ROADMAP[week - 1]
                if day <= len(week_data['days']):
                    topic = week_data['days'][day - 1]['topic']
            
            progress = Progress(
                user_id=current_user.id,
                week=week,
                day=day,
                topic=topic
            )
            db.session.add(progress)
        
        progress.completed = completed
        progress.time_spent += time_spent
        progress.notes = notes
        
        if completed and not progress.completion_date:
            progress.completion_date = datetime.utcnow()
        
        db.session.commit()
        
        # Update streak if completing today
        if completed:
            today = date.today()
            streak = Streak.query.filter_by(user_id=current_user.id).first()
            if streak and (not streak.last_activity_date or streak.last_activity_date != today):
                update_streaks()
        
        return jsonify({'message': 'Progress updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update progress error: {str(e)}")
        return jsonify({'message': 'Failed to update progress'}), 500

# Streak Routes
@app.route('/streaks', methods=['GET'])
@token_required
def get_streaks(current_user):
    try:
        streak = Streak.query.filter_by(user_id=current_user.id).first()
        
        if not streak:
            streak = Streak(user_id=current_user.id)
            db.session.add(streak)
            db.session.commit()
        
        # Get activity history for last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_progress = Progress.query.filter(
            Progress.user_id == current_user.id,
            Progress.completed == True,
            Progress.completion_date >= thirty_days_ago
        ).all()
        
        activity_map = {}
        for p in recent_progress:
            date_str = p.completion_date.date().isoformat()
            if date_str not in activity_map:
                activity_map[date_str] = 0
            activity_map[date_str] += p.time_spent
        
        return jsonify({
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
            'total_days_active': streak.total_days_active,
            'last_activity_date': streak.last_activity_date.isoformat() if streak.last_activity_date else None,
            'activity_history': activity_map
        }), 200
        
    except Exception as e:
        logger.error(f"Get streaks error: {str(e)}")
        return jsonify({'message': 'Failed to fetch streaks'}), 500

# Calendar Routes
@app.route('/calendar', methods=['GET'])
@token_required
def get_calendar_events(current_user):
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        query = CalendarEvent.query.filter_by(user_id=current_user.id)
        
        if start_date:
            query = query.filter(CalendarEvent.start_time >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(CalendarEvent.end_time <= datetime.fromisoformat(end_date))
        
        events = query.all()
        
        events_data = []
        for event in events:
            events_data.append({
                'id': str(event.id),
                'title': event.title,
                'description': event.description,
                'event_type': event.event_type,
                'start_time': event.start_time.isoformat(),
                'end_time': event.end_time.isoformat(),
                'recurring': event.recurring,
                'recurrence_rule': event.recurrence_rule,
                'reminder_minutes': event.reminder_minutes,
                'color': event.color
            })
        
        return jsonify({'events': events_data}), 200
        
    except Exception as e:
        logger.error(f"Get calendar error: {str(e)}")
        return jsonify({'message': 'Failed to fetch events'}), 500

@app.route('/calendar', methods=['POST'])
@token_required
def create_calendar_event(current_user):
    try:
        data = request.get_json()
        
        required_fields = ['title', 'start_time', 'end_time']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'{field} is required'}), 400
        
        event = CalendarEvent(
            user_id=current_user.id,
            title=data['title'],
            description=data.get('description'),
            event_type=data.get('event_type', 'study'),
            start_time=datetime.fromisoformat(data['start_time']),
            end_time=datetime.fromisoformat(data['end_time']),
            recurring=data.get('recurring', False),
            recurrence_rule=data.get('recurrence_rule'),
            reminder_minutes=data.get('reminder_minutes', 30),
            color=data.get('color', '#3B82F6')
        )
        
        db.session.add(event)
        db.session.commit()
        
        return jsonify({
            'message': 'Event created successfully',
            'event_id': str(event.id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create calendar event error: {str(e)}")
        return jsonify({'message': 'Failed to create event'}), 500

# Pomodoro Routes
@app.route('/pomodoro', methods=['GET'])
@token_required
def get_pomodoro_logs(current_user):
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        logs = PomodoroLog.query.filter_by(user_id=current_user.id)\
            .order_by(PomodoroLog.started_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()
        
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': str(log.id),
                'topic': log.topic,
                'duration': log.duration,
                'completed': log.completed,
                'started_at': log.started_at.isoformat(),
                'ended_at': log.ended_at.isoformat() if log.ended_at else None,
                'break_duration': log.break_duration,
                'notes': log.notes
            })
        
        # Get statistics
        total_sessions = PomodoroLog.query.filter_by(user_id=current_user.id).count()
        total_time = db.session.query(func.sum(PomodoroLog.duration))\
            .filter_by(user_id=current_user.id, completed=True).scalar() or 0
        
        return jsonify({
            'logs': logs_data,
            'statistics': {
                'total_sessions': total_sessions,
                'total_minutes': total_time,
                'average_duration': round(total_time / total_sessions, 2) if total_sessions > 0 else 0
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get pomodoro logs error: {str(e)}")
        return jsonify({'message': 'Failed to fetch logs'}), 500

@app.route('/pomodoro', methods=['POST'])
@token_required
def log_pomodoro(current_user):
    try:
        data = request.get_json()
        
        log = PomodoroLog(
            user_id=current_user.id,
            topic=data.get('topic'),
            duration=data.get('duration', 25),
            completed=data.get('completed', True),
            started_at=datetime.fromisoformat(data['started_at']),
            ended_at=datetime.fromisoformat(data['ended_at']) if data.get('ended_at') else None,
            break_duration=data.get('break_duration', 0),
            notes=data.get('notes')
        )
        
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'message': 'Pomodoro logged successfully',
            'log_id': str(log.id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Log pomodoro error: {str(e)}")
        return jsonify({'message': 'Failed to log pomodoro'}), 500

# Notes Routes
@app.route('/notes', methods=['GET'])
@token_required
def get_notes(current_user):
    try:
        query = Note.query.filter_by(user_id=current_user.id)
        
        # Filters
        topic = request.args.get('topic')
        week = request.args.get('week', type=int)
        tag = request.args.get('tag')
        search = request.args.get('search')
        
        if topic:
            query = query.filter(Note.topic == topic)
        if week:
            query = query.filter(Note.week == week)
        if search:
            query = query.filter(
                or_(
                    Note.title.ilike(f'%{search}%'),
                    Note.content.ilike(f'%{search}%')
                )
            )
        
        notes = query.order_by(Note.is_pinned.desc(), Note.updated_at.desc()).all()
        
        notes_data = []
        for note in notes:
            notes_data.append({
                'id': str(note.id),
                'title': note.title,
                'content': note.content,
                'topic': note.topic,
                'week': note.week,
                'tags': note.tags or [],
                'is_pinned': note.is_pinned,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat()
            })
        
        return jsonify({'notes': notes_data}), 200
        
    except Exception as e:
        logger.error(f"Get notes error: {str(e)}")
        return jsonify({'message': 'Failed to fetch notes'}), 500

@app.route('/notes', methods=['POST'])
@token_required
def create_note(current_user):
    try:
        data = request.get_json()
        
        if not data.get('title') or not data.get('content'):
            return jsonify({'message': 'Title and content required'}), 400
        
        note = Note(
            user_id=current_user.id,
            title=data['title'],
            content=data['content'],
            topic=data.get('topic'),
            week=data.get('week'),
            tags=data.get('tags', []),
            is_pinned=data.get('is_pinned', False)
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'message': 'Note created successfully',
            'note_id': str(note.id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create note error: {str(e)}")
        return jsonify({'message': 'Failed to create note'}), 500

@app.route('/notes/<note_id>', methods=['PUT'])
@token_required
def update_note(current_user, note_id):
    try:
        note = Note.query.filter_by(id=note_id, user_id=current_user.id).first()
        
        if not note:
            return jsonify({'message': 'Note not found'}), 404
        
        data = request.get_json()
        
        if 'title' in data:
            note.title = data['title']
        if 'content' in data:
            note.content = data['content']
        if 'topic' in data:
            note.topic = data['topic']
        if 'week' in data:
            note.week = data['week']
        if 'tags' in data:
            note.tags = data['tags']
        if 'is_pinned' in data:
            note.is_pinned = data['is_pinned']
        
        note.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Note updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update note error: {str(e)}")
        return jsonify({'message': 'Failed to update note'}), 500

@app.route('/notes/<note_id>', methods=['DELETE'])
@token_required
def delete_note(current_user, note_id):
    try:
        note = Note.query.filter_by(id=note_id, user_id=current_user.id).first()
        
        if not note:
            return jsonify({'message': 'Note not found'}), 404
        
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({'message': 'Note deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete note error: {str(e)}")
        return jsonify({'message': 'Failed to delete note'}), 500

# Notifications Routes
@app.route('/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    try:
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = request.args.get('limit', 20, type=int)
        
        query = Notification.query.filter_by(user_id=current_user.id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
        
        notifications_data = []
        for notif in notifications:
            notifications_data.append({
                'id': str(notif.id),
                'type': notif.type,
                'title': notif.title,
                'message': notif.message,
                'is_read': notif.is_read,
                'data': notif.data,
                'created_at': notif.created_at.isoformat()
            })
        
        unread_count = Notification.query.filter_by(
            user_id=current_user.id,
            is_read=False
        ).count()
        
        return jsonify({
            'notifications': notifications_data,
            'unread_count': unread_count
        }), 200
        
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        return jsonify({'message': 'Failed to fetch notifications'}), 500

@app.route('/notifications/<notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(current_user, notification_id):
    try:
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user.id
        ).first()
        
        if not notification:
            return jsonify({'message': 'Notification not found'}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Mark notification read error: {str(e)}")
        return jsonify({'message': 'Failed to update notification'}), 500

@app.route('/notifications/read-all', methods=['PUT'])
@token_required
def mark_all_notifications_read(current_user):
    try:
        Notification.query.filter_by(
            user_id=current_user.id,
            is_read=False
        ).update({'is_read': True})
        
        db.session.commit()
        
        return jsonify({'message': 'All notifications marked as read'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Mark all notifications read error: {str(e)}")
        return jsonify({'message': 'Failed to update notifications'}), 500

# Dashboard/Analytics Routes
@app.route('/dashboard', methods=['GET'])
@token_required
@cache.cached(timeout=60)
def get_dashboard(current_user):
    try:
        # Get date ranges
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        
        # Progress statistics
        total_progress = Progress.query.filter_by(user_id=current_user.id, completed=True).count()
        
        # Time statistics
        total_time = db.session.query(func.sum(Progress.time_spent))\
            .filter_by(user_id=current_user.id).scalar() or 0
        
        week_time = db.session.query(func.sum(Progress.time_spent))\
            .filter(
                Progress.user_id == current_user.id,
                Progress.completion_date >= week_start
            ).scalar() or 0
        
        # Pomodoro statistics
        total_pomodoros = PomodoroLog.query.filter_by(user_id=current_user.id, completed=True).count()
        
        week_pomodoros = PomodoroLog.query.filter(
            PomodoroLog.user_id == current_user.id,
            PomodoroLog.completed == True,
            PomodoroLog.started_at >= week_start
        ).count()
        
        # Streak info
        streak = Streak.query.filter_by(user_id=current_user.id).first()
        
        # Recent activity
        recent_progress = Progress.query.filter_by(user_id=current_user.id)\
            .order_by(Progress.completion_date.desc())\
            .limit(5).all()
        
        recent_activity = []
        for p in recent_progress:
            recent_activity.append({
                'week': p.week,
                'day': p.day,
                'topic': p.topic,
                'completed_at': p.completion_date.isoformat() if p.completion_date else None
            })
        
        # Topic distribution
        topic_time = db.session.query(
            Progress.topic,
            func.sum(Progress.time_spent).label('total_time')
        ).filter_by(user_id=current_user.id)\
        .group_by(Progress.topic)\
        .order_by(func.sum(Progress.time_spent).desc())\
        .limit(5).all()
        
        top_topics = [{'topic': t[0], 'time': t[1]} for t in topic_time]
        
        return jsonify({
            'statistics': {
                'total_completed': total_progress,
                'total_time_minutes': total_time,
                'week_time_minutes': week_time,
                'total_pomodoros': total_pomodoros,
                'week_pomodoros': week_pomodoros,
                'completion_rate': round((total_progress / 98) * 100, 2)
            },
            'streak': {
                'current': streak.current_streak if streak else 0,
                'longest': streak.longest_streak if streak else 0,
                'total_days': streak.total_days_active if streak else 0
            },
            'recent_activity': recent_activity,
            'top_topics': top_topics
        }), 200
        
    except Exception as e:
        logger.error(f"Get dashboard error: {str(e)}")
        return jsonify({'message': 'Failed to fetch dashboard data'}), 500

@app.route('/analytics/dashboard', methods=['GET'])
@token_required
def get_analytics_dashboard(current_user):
    try:
        # Time range
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Progress over time
        progress_data = db.session.query(
            func.date(Progress.completion_date).label('date'),
            func.count(Progress.id).label('completed'),
            func.sum(Progress.time_spent).label('time_spent')
        ).filter(
            Progress.user_id == current_user.id,
            Progress.completed == True,
            Progress.completion_date >= start_date
        ).group_by(func.date(Progress.completion_date)).all()
        
        progress_timeline = []
        for p in progress_data:
            progress_timeline.append({
                'date': p.date.isoformat() if p.date else None,
                'completed': p.completed,
                'time_spent': p.time_spent
            })
        
        # Week-by-week progress
        week_progress = db.session.query(
            Progress.week,
            func.count(Progress.id).label('completed'),
            func.sum(Progress.time_spent).label('time_spent')
        ).filter(
            Progress.user_id == current_user.id,
            Progress.completed == True
        ).group_by(Progress.week).all()
        
        weekly_data = []
        for w in week_progress:
            weekly_data.append({
                'week': w.week,
                'completed': w.completed,
                'time_spent': w.time_spent,
                'completion_rate': round((w.completed / 7) * 100, 2)
            })
        
        # Learning patterns
        hour_distribution = db.session.query(
            extract('hour', Progress.completion_date).label('hour'),
            func.count(Progress.id).label('count')
        ).filter(
            Progress.user_id == current_user.id,
            Progress.completed == True
        ).group_by(extract('hour', Progress.completion_date)).all()
        
        learning_hours = {int(h.hour): h.count for h in hour_distribution if h.hour is not None}
        
        # Pomodoro analytics
        pomodoro_stats = db.session.query(
            func.date(PomodoroLog.started_at).label('date'),
            func.count(PomodoroLog.id).label('sessions'),
            func.sum(PomodoroLog.duration).label('total_duration')
        ).filter(
            PomodoroLog.user_id == current_user.id,
            PomodoroLog.completed == True,
            PomodoroLog.started_at >= start_date
        ).group_by(func.date(PomodoroLog.started_at)).all()
        
        pomodoro_timeline = []
        for p in pomodoro_stats:
            pomodoro_timeline.append({
                'date': p.date.isoformat() if p.date else None,
                'sessions': p.sessions,
                'total_duration': p.total_duration
            })
        
        return jsonify({
            'progress_timeline': progress_timeline,
            'weekly_progress': weekly_data,
            'learning_hours': learning_hours,
            'pomodoro_timeline': pomodoro_timeline
        }), 200
        
    except Exception as e:
        logger.error(f"Get analytics error: {str(e)}")
        return jsonify({'message': 'Failed to fetch analytics'}), 500

# AI Routes
@app.route('/ai/generate-study-plan', methods=['POST'])
@token_required
@limiter.limit("5 per day")
def generate_study_plan(current_user):
    try:
        data = request.get_json()
        
        # Get user's current progress
        progress = Progress.query.filter_by(user_id=current_user.id, completed=True).all()
        completed_topics = {f"week{p.week}_day{p.day}": p.topic for p in progress}
        
        # Get user preferences
        prefs = UserPreference.query.filter_by(user_id=current_user.id).first()
        daily_goal = prefs.daily_goal_minutes if prefs else 120
        
        # Simple AI logic to generate personalized plan
        # In production, you might use OpenAI API or similar
        plan_data = {
            'recommendations': [],
            'focus_areas': [],
            'suggested_schedule': []
        }
        
        # Analyze weak areas based on time spent
        avg_time = db.session.query(func.avg(Progress.time_spent))\
            .filter_by(user_id=current_user.id, completed=True).scalar() or 0
        
        weak_topics = Progress.query.filter(
            Progress.user_id == current_user.id,
            Progress.completed == True,
            Progress.time_spent > avg_time * 1.5
        ).all()
        
        for topic in weak_topics[:3]:
            plan_data['focus_areas'].append({
                'topic': topic.topic,
                'reason': 'Took longer than average to complete',
                'suggested_resources': [r for r in RESOURCES.values() if topic.topic.lower() in r['title'].lower()][:3]
            })
        
        # Generate recommendations based on current progress
        current_week = len(set(p.week for p in progress))
        if current_week > 0:
            next_week = ROADMAP[min(current_week, len(ROADMAP) - 1)]
            plan_data['recommendations'].append({
                'type': 'next_topic',
                'title': f"Continue with {next_week['title']}",
                'description': next_week['goal']
            })
        
        # Create suggested schedule
        for i in range(7):
            day_date = date.today() + timedelta(days=i)
            plan_data['suggested_schedule'].append({
                'date': day_date.isoformat(),
                'suggested_minutes': daily_goal,
                'topics': ['Review previous topics' if i % 7 == 6 else 'Continue current module']
            })
        
        # Save the plan
        study_plan = StudyPlan(
            user_id=current_user.id,
            name=f"AI Generated Plan - {date.today().isoformat()}",
            description="Personalized study plan based on your progress",
            plan_data=plan_data
        )
        db.session.add(study_plan)
        db.session.commit()
        
        return jsonify({
            'message': 'Study plan generated successfully',
            'plan': plan_data,
            'plan_id': str(study_plan.id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Generate study plan error: {str(e)}")
        return jsonify({'message': 'Failed to generate study plan'}), 500

# Search Route
@app.route('/search', methods=['GET'])
@token_required
def search(current_user):
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'results': []}), 200
        
        results = {
            'resources': [],
            'notes': [],
            'topics': []
        }
        
        # Search resources
        for key, resource in RESOURCES.items():
            if query.lower() in resource['title'].lower():
                results['resources'].append({
                    'id': key,
                    'title': resource['title'],
                    'url': resource['url'],
                    'type': resource['type']
                })
        
        # Search notes
        notes = Note.query.filter(
            Note.user_id == current_user.id,
            or_(
                Note.title.ilike(f'%{query}%'),
                Note.content.ilike(f'%{query}%')
            )
        ).limit(10).all()
        
        for note in notes:
            results['notes'].append({
                'id': str(note.id),
                'title': note.title,
                'excerpt': note.content[:100] + '...' if len(note.content) > 100 else note.content
            })
        
        # Search roadmap topics
        for week in ROADMAP:
            for day in week['days']:
                if query.lower() in day['topic'].lower():
                    results['topics'].append({
                        'week': week['week'],
                        'day': day['day'],
                        'topic': day['topic'],
                        'activities': day['activities']
                    })
        
        return jsonify({'results': results}), 200
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({'message': 'Search failed'}), 500

# Settings Route
@app.route('/settings', methods=['GET'])
@token_required
def get_settings(current_user):
    try:
        prefs = UserPreference.query.filter_by(user_id=current_user.id).first()
        
        settings = {
            'account': {
                'email': current_user.email,
                'username': current_user.username,
                'created_at': current_user.created_at.isoformat()
            },
            'preferences': {
                'theme': prefs.theme if prefs else 'light',
                'layout': prefs.layout if prefs else 'default',
                'email_notifications': prefs.email_notifications if prefs else True,
                'push_notifications': prefs.push_notifications if prefs else True,
                'daily_goal_minutes': prefs.daily_goal_minutes if prefs else 120,
                'preferred_language': prefs.preferred_language if prefs else 'python',
                'timezone': prefs.timezone if prefs else 'UTC'
            }
        }
        
        return jsonify(settings), 200
        
    except Exception as e:
        logger.error(f"Get settings error: {str(e)}")
        return jsonify({'message': 'Failed to fetch settings'}), 500

# Roadmap and Resources Routes
@app.route('/roadmap', methods=['GET'])
@cache.cached(timeout=3600)
def get_roadmap():
    return jsonify({'roadmap': ROADMAP}), 200

@app.route('/resources', methods=['GET'])
@cache.cached(timeout=3600)
def get_resources():
    resource_type = request.args.get('type')
    
    if resource_type:
        filtered = {k: v for k, v in RESOURCES.items() if v['type'] == resource_type}
        return jsonify({'resources': filtered}), 200
    
    return jsonify({'resources': RESOURCES}), 200

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Resource not found'}), 404

@app.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({'message': 'Rate limit exceeded. Please try again later.'}), 429

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    logger.error(f"Internal error: {str(error)}")
    return jsonify({'message': 'Internal server error'}), 500

# Cleanup on shutdown
import atexit
def shutdown_scheduler():
    try:
        scheduler.shutdown()
    except:
        pass

atexit.register(shutdown_scheduler)

# Initialize database
def initialize_database():
    with app.app_context():
        db.create_all()
        logger.info("Database initialized")

# Call it before running the app
if __name__ == '__main__':
    initialize_database()
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)