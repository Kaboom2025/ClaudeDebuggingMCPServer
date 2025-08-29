#!/usr/bin/env python3
"""
Class-based Python debugging example for MCP debugger.

This demonstrates debugging object-oriented Python code with classes, inheritance, and methods.
"""

class DataProcessor:
    """A class that processes data with various methods."""
    
    def __init__(self, name: str):
        self.name = name
        self.processed_items = []
        self.error_count = 0
        print(f"Created DataProcessor: {self.name}")
    
    def process_item(self, item: dict) -> dict:
        """Process a single item."""
        print(f"Processing item: {item}")
        
        # Set breakpoint here to inspect item and self
        if not isinstance(item, dict):
            self.error_count += 1
            raise TypeError(f"Expected dict, got {type(item)}")
        
        # Validate required fields
        required_fields = ['id', 'name', 'value']
        for field in required_fields:
            if field not in item:  # Set breakpoint here to debug missing fields
                self.error_count += 1
                raise KeyError(f"Missing required field: {field}")
        
        # Process the item
        processed = {
            'id': item['id'],
            'name': item['name'].upper(),
            'value': item['value'] * 2,
            'processed_by': self.name,
            'timestamp': __import__('time').time()
        }
        
        self.processed_items.append(processed)
        print(f"Successfully processed item {item['id']}")
        return processed
    
    def process_batch(self, items: list) -> list:
        """Process a batch of items."""
        results = []
        
        print(f"Processing batch of {len(items)} items")
        
        for i, item in enumerate(items):  # Set breakpoint here to debug loop
            try:
                result = self.process_item(item)
                results.append(result)
            except Exception as e:
                print(f"Error processing item {i}: {e}")
                # Set breakpoint here to debug errors
                results.append({'error': str(e), 'item_index': i})
        
        return results
    
    def get_stats(self) -> dict:
        """Get processing statistics."""
        # Set breakpoint here to inspect self state
        return {
            'processor_name': self.name,
            'total_processed': len(self.processed_items),
            'error_count': self.error_count,
            'success_rate': (len(self.processed_items) / max(len(self.processed_items) + self.error_count, 1)) * 100
        }

class AdvancedProcessor(DataProcessor):
    """An advanced data processor with additional features."""
    
    def __init__(self, name: str, max_errors: int = 5):
        super().__init__(name)
        self.max_errors = max_errors
        self.validation_rules = []
    
    def add_validation_rule(self, rule_name: str, validator):
        """Add a custom validation rule."""
        self.validation_rules.append({
            'name': rule_name,
            'validator': validator
        })
        print(f"Added validation rule: {rule_name}")
    
    def process_item(self, item: dict) -> dict:
        """Process item with advanced validation."""
        # Set breakpoint here to debug inheritance
        if self.error_count >= self.max_errors:
            raise RuntimeError(f"Too many errors ({self.error_count}), stopping processing")
        
        # Run custom validations
        for rule in self.validation_rules:  # Set breakpoint here to debug validation rules
            try:
                if not rule['validator'](item):
                    self.error_count += 1
                    raise ValueError(f"Validation failed: {rule['name']}")
            except Exception as e:
                self.error_count += 1
                raise ValueError(f"Validation error in {rule['name']}: {e}")
        
        # Call parent method
        return super().process_item(item)

def create_test_data():
    """Create test data for processing."""
    return [
        {'id': 1, 'name': 'alice', 'value': 10},
        {'id': 2, 'name': 'bob', 'value': 20},
        {'id': 3, 'name': 'charlie', 'value': 30},
        {'id': 4, 'name': '', 'value': 40},  # Will cause validation error
        {'id': 5, 'value': 50},  # Missing 'name' field
        {'id': 6, 'name': 'diana', 'value': 60},
    ]

def main():
    """Main function to demonstrate class debugging."""
    print("🧪 Class-based debugging example")
    
    # Test basic processor
    print("\n--- Basic DataProcessor ---")
    processor = DataProcessor("BasicProcessor")
    
    test_data = create_test_data()
    
    # Set breakpoint here to debug object creation
    try:
        results = processor.process_batch(test_data)
        stats = processor.get_stats()
        
        print(f"Processing completed. Stats: {stats}")
        print(f"Results: {len(results)} items processed")
        
    except Exception as e:
        print(f"Error in basic processing: {e}")
    
    # Test advanced processor with validation
    print("\n--- Advanced Processor with Validation ---")
    advanced = AdvancedProcessor("AdvancedProcessor", max_errors=3)
    
    # Add custom validation rules
    advanced.add_validation_rule("name_not_empty", lambda item: len(item.get('name', '')) > 0)
    advanced.add_validation_rule("positive_value", lambda item: item.get('value', 0) > 0)
    
    # Set breakpoint here to debug advanced processing
    try:
        advanced_results = advanced.process_batch(test_data)
        advanced_stats = advanced.get_stats()
        
        print(f"Advanced processing completed. Stats: {advanced_stats}")
        
    except Exception as e:
        print(f"Error in advanced processing: {e}")
        # Set breakpoint here to debug caught exceptions
        final_stats = advanced.get_stats()
        print(f"Final stats after error: {final_stats}")

if __name__ == "__main__":
    main()