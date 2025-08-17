#backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity, create_refresh_token, get_jwt
from flask_cors import CORS
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta, timezone
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import cloudinary
import cloudinary.uploader
from openai import OpenAI
import json
import re
from sqlalchemy import or_, and_, func, desc
from sqlalchemy.dialects.postgresql import UUID
import uuid
from collections import defaultdict

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Database Configuration
if os.getenv('DATABASE_URL'):
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL').replace('postgres://', 'postgresql://')
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dsa_prep.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, origins=['http://localhost:3000', 'https://dsa-learningdaily.vercel.app'])

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# OpenAI Configuration - Initialize only if API key is available
openai_client = None
if os.getenv('OPENAI_API_KEY'):
    try:
        openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    except Exception as e:
        print(f"OpenAI initialization failed: {e}")
        openai_client = None

# Email Configuration
SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 587
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASS = os.getenv('SMTP_PASS')

# Embedded Data
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
} ] },
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
"day": "Saturday","topic": "Project Start: File Compressor","activities": "Huffman coding implementation","resources": [], "time_estimate": 180
},
{
"day": "Sunday","topic": "Final Project: Mini Database","activities": "Complete system with all DSA concepts","resources": [],"time_estimate": 180
}
]
}
]

# Database Models
class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.String(255))
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    total_study_time = db.Column(db.Integer, default=0)
    last_streak_date = db.Column(db.Date)

class PasswordReset(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

class UserSession(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    device_info = db.Column(db.String(255))
    ip_address = db.Column(db.String(45))
    login_time = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

class Notification(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text)
    type = db.Column(db.String(50), default='info')
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserPreferences(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), unique=True, nullable=False)
    theme = db.Column(db.String(20), default='light')
    layout = db.Column(db.String(20), default='default')
    notifications_enabled = db.Column(db.Boolean, default=True)
    email_notifications = db.Column(db.Boolean, default=True)
    accessibility_mode = db.Column(db.Boolean, default=False)
    language = db.Column(db.String(10), default='en')

class Progress(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    week = db.Column(db.Integer, nullable=False)
    day = db.Column(db.String(20), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    completion_date = db.Column(db.DateTime)
    time_spent = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)

class PomodoroSession(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    duration = db.Column(db.Integer, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    topic = db.Column(db.String(200))
    session_type = db.Column(db.String(20), default='study')

class Note(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    tags = db.Column(db.String(500))
    week = db.Column(db.Integer)
    day = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIConversation(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    citations = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Helper Functions
def send_email(to_email, subject, body):
    try:
        msg = MIMEMultipart()  # Changed from MimeMultipart
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))  # Changed from MimeText
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

def upload_to_cloudinary(file):
    try:
        result = cloudinary.uploader.upload(file)
        return result['secure_url']
    except Exception as e:
        print(f"Cloudinary error: {e}")
        return None

def get_relevant_context(query, limit=5):
    context_resources = []
    query_lower = query.lower()
    
    for key, resource in RESOURCES.items():
        title_lower = resource['title'].lower()
        if any(word in title_lower for word in query_lower.split()):
            context_resources.append(resource)
            if len(context_resources) >= limit:
                break
    
    roadmap_context = []
    for week in ROADMAP:
        week_text = f"{week['title']} {week['goal']}".lower()
        if any(word in week_text for word in query_lower.split()):
            roadmap_context.append(week)
            if len(roadmap_context) >= 3:
                break
    
    return context_resources, roadmap_context

def ai_ask(question, user_id):
    try:
        context_resources, roadmap_context = get_relevant_context(question)
        
        context_text = "RESOURCES:\n"
        citations = []
        for resource in context_resources:
            context_text += f"- {resource['title']}: {resource['url']}\n"
            citations.append(resource)
        
        if roadmap_context:
            context_text += "\nROADMAP CONTEXT:\n"
            for week in roadmap_context:
                context_text += f"Week {week['week']}: {week['title']} - {week['goal']}\n"
        
        prompt = f"""You are a helpful DSA (Data Structures and Algorithms) tutor. Answer the following question based on the provided context.

CONTEXT:
{context_text}

QUESTION: {question}

Provide a clear, educational answer. If you reference any resources from the context, mention them naturally in your response."""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        answer = response.choices[0].message.content
        
        conversation = AIConversation(
            user_id=user_id,
            question=question,
            answer=answer,
            citations=json.dumps(citations)
        )
        db.session.add(conversation)
        db.session.commit()
        
        return {"answer": answer, "citations": citations}
    except Exception as e:
        return {"error": str(e)}

# Authentication Routes
@app.route('/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"error": "Email already registered"}), 400
        
        user = User(
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            name=data['name']
        )
        
        db.session.add(user)
        db.session.commit()
        
        preferences = UserPreferences(user_id=user.id)
        db.session.add(preferences)
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url
            }
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({"error": "Invalid credentials"}), 401
        
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        session = UserSession(
            user_id=user.id,
            device_info=request.headers.get('User-Agent', ''),
            ip_address=request.remote_addr
        )
        db.session.add(session)
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if not user:
            return jsonify({"message": "If email exists, reset link sent"}), 200
        
        token = secrets.token_urlsafe(32)
        reset = PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        
        db.session.add(reset)
        db.session.commit()
        
        reset_link = f"https://your-frontend-domain.com/reset-password?token={token}"
        html_body = f"""
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="{reset_link}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        """
        
        send_email(user.email, "Password Reset Request", html_body)
        
        return jsonify({"message": "If email exists, reset link sent"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        reset = PasswordReset.query.filter_by(
            token=data['token'],
            used=False
        ).first()
        
        if not reset or reset.expires_at < datetime.utcnow():
            return jsonify({"error": "Invalid or expired token"}), 400
        
        user = User.query.get(reset.user_id)
        user.password_hash = generate_password_hash(data['password'])
        reset.used = True
        
        db.session.commit()
        
        return jsonify({"message": "Password reset successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)
    return jsonify({"access_token": access_token})

# Profile Routes
@app.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        preferences = UserPreferences.query.filter_by(user_id=user_id).first()
        
        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "created_at": user.created_at.isoformat(),
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
                "total_study_time": user.total_study_time
            },
            "preferences": {
                "theme": preferences.theme if preferences else 'light',
                "layout": preferences.layout if preferences else 'default',
                "notifications_enabled": preferences.notifications_enabled if preferences else True,
                "email_notifications": preferences.email_notifications if preferences else True,
                "accessibility_mode": preferences.accessibility_mode if preferences else False,
                "language": preferences.language if preferences else 'en'
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()
        
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            if User.query.filter(User.email == data['email'], User.id != user_id).first():
                return jsonify({"error": "Email already in use"}), 400
            user.email = data['email']
        
        db.session.commit()
        
        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/profile/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if 'avatar' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['avatar']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        avatar_url = upload_to_cloudinary(file)
        if not avatar_url:
            return jsonify({"error": "Upload failed"}), 500
        
        user.avatar_url = avatar_url
        db.session.commit()
        
        return jsonify({
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Preferences Routes
@app.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        preferences = UserPreferences.query.filter_by(user_id=user_id).first()
        if not preferences:
            preferences = UserPreferences(user_id=user_id)
            db.session.add(preferences)
        
        for key, value in data.items():
            if hasattr(preferences, key):
                setattr(preferences, key, value)
        
        db.session.commit()
        
        return jsonify({"message": "Preferences updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Notifications Routes
@app.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        notifications = Notification.query.filter_by(user_id=user_id)\
            .order_by(desc(Notification.created_at))\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            "notifications": [{
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat()
            } for n in notifications.items],
            "pagination": {
                "page": page,
                "pages": notifications.pages,
                "per_page": per_page,
                "total": notifications.total
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/notifications/<notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    try:
        user_id = get_jwt_identity()
        notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        
        if not notification:
            return jsonify({"error": "Notification not found"}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({"message": "Notification marked as read"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Progress Routes
@app.route('/progress', methods=['GET'])
@jwt_required()
def get_progress():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        progress = Progress.query.filter_by(user_id=user_id).all()
        progress_data = {}
        
        for p in progress:
            if p.week not in progress_data:
                progress_data[p.week] = {}
            progress_data[p.week][p.day] = {
                "completed": p.completed,
                "completion_date": p.completion_date.isoformat() if p.completion_date else None,
                "time_spent": p.time_spent,
                "notes": p.notes
            }
        
        return jsonify({
            "progress": progress_data,
            "stats": {
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
                "total_study_time": user.total_study_time
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/progress', methods=['POST'])
@jwt_required()
def update_progress():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        progress = Progress.query.filter_by(
            user_id=user_id,
            week=data['week'],
            day=data['day']
        ).first()
        
        if not progress:
            progress = Progress(
                user_id=user_id,
                week=data['week'],
                day=data['day']
            )
            db.session.add(progress)
        
        progress.completed = data.get('completed', False)
        progress.time_spent = data.get('time_spent', 0)
        progress.notes = data.get('notes', '')
        
        if progress.completed and not progress.completion_date:
            progress.completion_date = datetime.utcnow()
            
            user = User.query.get(user_id)
            user.total_study_time += progress.time_spent
            
            today = datetime.utcnow().date()
            if user.last_streak_date == today - timedelta(days=1):
                user.current_streak += 1
            elif user.last_streak_date != today:
                user.current_streak = 1
            
            user.last_streak_date = today
            if user.current_streak > user.longest_streak:
                user.longest_streak = user.current_streak
        
        db.session.commit()
        
        return jsonify({"message": "Progress updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Calendar Routes
@app.route('/calendar', methods=['GET'])
@jwt_required()
def get_calendar():
    try:
        user_id = get_jwt_identity()
        week = request.args.get('week', type=int)
        
        if week:
            roadmap_week = next((w for w in ROADMAP if w['week'] == week), None)
            if not roadmap_week:
                return jsonify({"error": "Week not found"}), 404
            
            progress = Progress.query.filter_by(user_id=user_id, week=week).all()
            progress_dict = {p.day: p for p in progress}
            
            calendar_data = {
                "week": roadmap_week,
                "progress": {}
            }
            
            for day_data in roadmap_week['days']:
                day = day_data['day']
                p = progress_dict.get(day)
                calendar_data["progress"][day] = {
                    "completed": p.completed if p else False,
                    "time_spent": p.time_spent if p else 0,
                    "completion_date": p.completion_date.isoformat() if p and p.completion_date else None
                }
            
            return jsonify(calendar_data)
        else:
            progress = Progress.query.filter_by(user_id=user_id).all()
            calendar_overview = {}
            
            for week_data in ROADMAP:
                week_num = week_data['week']
                week_progress = [p for p in progress if p.week == week_num]
                total_days = len(week_data['days'])
                completed_days = len([p for p in week_progress if p.completed])
                
                calendar_overview[week_num] = {
                    "title": week_data['title'],
                    "completed_days": completed_days,
                    "total_days": total_days,
                    "completion_percentage": (completed_days / total_days) * 100 if total_days > 0 else 0
                }
            
            return jsonify({"calendar": calendar_overview})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Pomodoro Routes
@app.route('/pomodoro', methods=['POST'])
@jwt_required()
def start_pomodoro():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        session = PomodoroSession(
            user_id=user_id,
            start_time=datetime.utcnow(),
            duration=data.get('duration', 25),
            topic=data.get('topic', ''),
            session_type=data.get('session_type', 'study')
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            "session_id": session.id,
            "start_time": session.start_time.isoformat()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/pomodoro/<session_id>/complete', methods=['POST'])
@jwt_required()
def complete_pomodoro(session_id):
    try:
        user_id = get_jwt_identity()
        session = PomodoroSession.query.filter_by(id=session_id, user_id=user_id).first()
        
        if not session:
            return jsonify({"error": "Session not found"}), 404
        
        session.end_time = datetime.utcnow()
        session.completed = True
        
        actual_duration = (session.end_time - session.start_time).total_seconds() / 60
        session.duration = min(session.duration, actual_duration)
        
        db.session.commit()
        
        return jsonify({
            "message": "Session completed",
            "actual_duration": actual_duration
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/pomodoro/history', methods=['GET'])
@jwt_required()
def get_pomodoro_history():
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        sessions = PomodoroSession.query.filter_by(user_id=user_id)\
            .order_by(desc(PomodoroSession.start_time))\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            "sessions": [{
                "id": s.id,
                "start_time": s.start_time.isoformat(),
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "duration": s.duration,
                "completed": s.completed,
                "topic": s.topic,
                "session_type": s.session_type
            } for s in sessions.items],
            "pagination": {
                "page": page,
                "pages": sessions.pages,
                "per_page": per_page,
                "total": sessions.total
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Notes Routes
@app.route('/notes', methods=['GET'])
@jwt_required()
def get_notes():
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        week = request.args.get('week', type=int)
        search = request.args.get('search', '')
        
        query = Note.query.filter_by(user_id=user_id)
        
        if week:
            query = query.filter_by(week=week)
        
        if search:
            query = query.filter(or_(
                Note.title.contains(search),
                Note.content.contains(search),
                Note.tags.contains(search)
            ))
        
        notes = query.order_by(desc(Note.updated_at))\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            "notes": [{
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "tags": n.tags.split(',') if n.tags else [],
                "week": n.week,
                "day": n.day,
                "created_at": n.created_at.isoformat(),
                "updated_at": n.updated_at.isoformat()
            } for n in notes.items],
            "pagination": {
                "page": page,
                "pages": notes.pages,
                "per_page": per_page,
                "total": notes.total
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/notes', methods=['POST'])
@jwt_required()
def create_note():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        note = Note(
            user_id=user_id,
            title=data['title'],
            content=data.get('content', ''),
            tags=','.join(data.get('tags', [])),
            week=data.get('week'),
            day=data.get('day')
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            "id": note.id,
            "message": "Note created successfully"
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/notes/<note_id>', methods=['PUT'])
@jwt_required()
def update_note(note_id):
    try:
        user_id = get_jwt_identity()
        note = Note.query.filter_by(id=note_id, user_id=user_id).first()
        
        if not note:
            return jsonify({"error": "Note not found"}), 404
        
        data = request.get_json()
        
        note.title = data.get('title', note.title)
        note.content = data.get('content', note.content)
        note.tags = ','.join(data.get('tags', note.tags.split(',') if note.tags else []))
        note.week = data.get('week', note.week)
        note.day = data.get('day', note.day)
        note.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({"message": "Note updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/notes/<note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    try:
        user_id = get_jwt_identity()
        note = Note.query.filter_by(id=note_id, user_id=user_id).first()
        
        if not note:
            return jsonify({"error": "Note not found"}), 404
        
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({"message": "Note deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Search Routes
@app.route('/search', methods=['GET'])
@jwt_required()
def search():
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({"error": "Search query required"}), 400
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search_type = request.args.get('type', 'all')
        
        results = {}
        
        if search_type in ['all', 'resources']:
            matching_resources = []
            query_lower = query.lower()
            
            for key, resource in RESOURCES.items():
                if (query_lower in resource['title'].lower() or
                    query_lower in resource.get('url', '').lower()):
                    matching_resources.append({
                        "id": key,
                        "title": resource['title'],
                        "url": resource['url'],
                        "type": resource['type']
                    })
            
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            results['resources'] = matching_resources[start_idx:end_idx]
            results['resources_total'] = len(matching_resources)
        
        if search_type in ['all', 'roadmap']:
            matching_roadmap = []
            for week in ROADMAP:
                if (query.lower() in week['title'].lower() or
                    query.lower() in week['goal'].lower()):
                    matching_roadmap.append(week)
            
            results['roadmap'] = matching_roadmap[:10]
        
        if search_type in ['all', 'notes']:
            user_id = get_jwt_identity()
            notes_query = Note.query.filter_by(user_id=user_id).filter(or_(
                Note.title.contains(query),
                Note.content.contains(query),
                Note.tags.contains(query)
            ))
            
            notes = notes_query.paginate(page=page, per_page=per_page, error_out=False)
            results['notes'] = [{
                "id": n.id,
                "title": n.title,
                "content": n.content[:200] + "..." if len(n.content) > 200 else n.content,
                "tags": n.tags.split(',') if n.tags else [],
                "updated_at": n.updated_at.isoformat()
            } for n in notes.items]
            results['notes_pagination'] = {
                "page": page,
                "pages": notes.pages,
                "total": notes.total
            }
        
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# AI Assistant Routes
@app.route('/ai/ask', methods=['POST'])
@jwt_required()
def ai_ask_endpoint():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        question = data.get('question', '').strip()
        
        if not question:
            return jsonify({"error": "Question required"}), 400
        
        result = ai_ask(question, user_id)
        
        if "error" in result:
            return jsonify(result), 500
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ai/study-plan', methods=['POST'])
@jwt_required()
def generate_study_plan():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        user = User.query.get(user_id)
        progress = Progress.query.filter_by(user_id=user_id).all()
        
        completed_weeks = set(p.week for p in progress if p.completed)
        current_week = len(completed_weeks) + 1
        
        available_time = data.get('available_time', 60)
        focus_areas = data.get('focus_areas', [])
        difficulty = data.get('difficulty', 'medium')
        
        prompt = f"""Create a personalized DSA study plan for a user who:
- Has completed {len(completed_weeks)} weeks of study
- Is currently on week {current_week}
- Has {available_time} minutes available daily
- Wants to focus on: {', '.join(focus_areas) if focus_areas else 'general DSA'}
- Prefers {difficulty} difficulty level

Based on the ROADMAP structure, suggest specific topics and time allocation for the next week."""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.7
        )
        
        return jsonify({
            "study_plan": response.choices[0].message.content,
            "current_week": current_week,
            "progress_summary": f"{len(completed_weeks)}/{len(ROADMAP)} weeks completed"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ai/quiz', methods=['POST'])
@jwt_required()
def generate_quiz():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        topic = data.get('topic', 'arrays')
        difficulty = data.get('difficulty', 'medium')
        question_count = min(data.get('question_count', 5), 10)
        
        prompt = f"""Generate {question_count} {difficulty} level multiple choice questions about {topic} in DSA.

Format each question as:
Q: [question text]
A) [option A]
B) [option B]  
C) [option C]
D) [option D]
Correct: [A/B/C/D]
Explanation: [brief explanation]

Focus on practical understanding and problem-solving concepts."""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.8
        )
        
        return jsonify({
            "quiz": response.choices[0].message.content,
            "topic": topic,
            "difficulty": difficulty,
            "question_count": question_count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ai/summarize', methods=['POST'])
@jwt_required()
def summarize_content():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        content_type = data.get('type', 'note')
        content_id = data.get('content_id')
        
        if content_type == 'note':
            note = Note.query.filter_by(id=content_id, user_id=user_id).first()
            if not note:
                return jsonify({"error": "Note not found"}), 404
            
            content = f"Title: {note.title}\n\nContent: {note.content}"
        elif content_type == 'resource':
            resource = RESOURCES.get(content_id)
            if not resource:
                return jsonify({"error": "Resource not found"}), 404
            
            content = f"Resource: {resource['title']}\nType: {resource['type']}\nURL: {resource['url']}"
        else:
            return jsonify({"error": "Invalid content type"}), 400
        
        prompt = f"""Provide a concise summary of the following content, highlighting key concepts and learning points:

{content}

Focus on the most important information for DSA learning."""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.5
        )
        
        return jsonify({
            "summary": response.choices[0].message.content,
            "content_type": content_type,
            "content_id": content_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Dashboard Routes
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        progress = Progress.query.filter_by(user_id=user_id).all()
        recent_sessions = PomodoroSession.query.filter_by(user_id=user_id)\
            .order_by(desc(PomodoroSession.start_time)).limit(5).all()
        recent_notes = Note.query.filter_by(user_id=user_id)\
            .order_by(desc(Note.updated_at)).limit(5).all()
        
        completed_days = len([p for p in progress if p.completed])
        total_days = len(ROADMAP) * 7
        
        weekly_progress = {}
        for week in ROADMAP:
            week_num = week['week']
            week_progress = [p for p in progress if p.week == week_num]
            completed_week_days = len([p for p in week_progress if p.completed])
            weekly_progress[week_num] = {
                "title": week['title'],
                "completed": completed_week_days,
                "total": len(week['days']),
                "percentage": (completed_week_days / len(week['days'])) * 100 if week['days'] else 0
            }
        
        study_time_last_7_days = db.session.query(func.sum(PomodoroSession.duration))\
            .filter(PomodoroSession.user_id == user_id,
                   PomodoroSession.start_time >= datetime.utcnow() - timedelta(days=7),
                   PomodoroSession.completed == True).scalar() or 0
        
        return jsonify({
            "stats": {
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
                "total_study_time": user.total_study_time,
                "study_time_last_7_days": study_time_last_7_days,
                "completion_percentage": (completed_days / total_days) * 100 if total_days > 0 else 0,
                "completed_days": completed_days,
                "total_days": total_days
            },
            "weekly_progress": weekly_progress,
            "recent_sessions": [{
                "id": s.id,
                "start_time": s.start_time.isoformat(),
                "duration": s.duration,
                "topic": s.topic,
                "completed": s.completed
            } for s in recent_sessions],
            "recent_notes": [{
                "id": n.id,
                "title": n.title,
                "updated_at": n.updated_at.isoformat()
            } for n in recent_notes]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Resource Routes
@app.route('/resources', methods=['GET'])
def get_resources():
    try:
        resource_type = request.args.get('type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        filtered_resources = RESOURCES
        if resource_type:
            filtered_resources = {k: v for k, v in RESOURCES.items() if v['type'] == resource_type}
        
        resource_list = [{"id": k, **v} for k, v in filtered_resources.items()]
        
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_resources = resource_list[start_idx:end_idx]
        
        return jsonify({
            "resources": paginated_resources,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": len(resource_list),
                "pages": (len(resource_list) + per_page - 1) // per_page
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/roadmap', methods=['GET'])
def get_roadmap():
    try:
        week = request.args.get('week', type=int)
        
        if week:
            roadmap_week = next((w for w in ROADMAP if w['week'] == week), None)
            if not roadmap_week:
                return jsonify({"error": "Week not found"}), 404
            return jsonify(roadmap_week)
        
        return jsonify({"roadmap": ROADMAP})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Session Management Routes
@app.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    try:
        user_id = get_jwt_identity()
        sessions = UserSession.query.filter_by(user_id=user_id, is_active=True)\
            .order_by(desc(UserSession.last_activity)).all()
        
        return jsonify({
            "sessions": [{
                "id": s.id,
                "device_info": s.device_info,
                "ip_address": s.ip_address,
                "login_time": s.login_time.isoformat(),
                "last_activity": s.last_activity.isoformat()
            } for s in sessions]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sessions/<session_id>', methods=['DELETE'])
@jwt_required()
def revoke_session(session_id):
    try:
        user_id = get_jwt_identity()
        session = UserSession.query.filter_by(id=session_id, user_id=user_id).first()
        
        if not session:
            return jsonify({"error": "Session not found"}), 404
        
        session.is_active = False
        db.session.commit()
        
        return jsonify({"message": "Session revoked successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({"error": "Token has expired"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({"error": "Invalid token"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({"error": "Authorization token required"}), 401

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# Health Check
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    })

# Initialize Database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))